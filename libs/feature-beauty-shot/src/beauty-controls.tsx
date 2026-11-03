import { useEffect, useId, useRef, useState } from 'react';
import { useViewerState, type ViewerStore } from '@schablone/3d-studio-core';
import { Button, Field, SegmentedControl, Switch } from '@schablone/3d-studio-ui';
import { Camera, Download } from 'lucide-react';
import type { BeautyConfig } from './config';
import { cameras, type Shot } from './capture-source';
import './beauty-shot.css';

export const BeautyControls = ({ viewer, config }: { viewer: ViewerStore; config: BeautyConfig }) => {
  const titleId = useId();
  const ready = useViewerState((state) => state.status === 'ready');
  const initial = config.presets.find((item) => item.id === config.initial) ?? config.presets[0];
  const [preset, setPreset] = useState(initial);
  const [samples, setSamples] = useState(initial.samples);
  const [denoise, setDenoise] = useState(initial.denoise);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState<{ fraction: number; seconds?: number }>();
  const [image, setImage] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  const originalUrl = useRef('');
  const dialog = useRef<HTMLDialogElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const job = useRef<AbortController | null>(null);
  const imageUrl = useRef('');
  const clear = () => {
    job.current?.abort();
    job.current = null;
    if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
    imageUrl.current = '';
    if (originalUrl.current) URL.revokeObjectURL(originalUrl.current);
    originalUrl.current = '';
  };
  useEffect(() => clear, []);
  const close = () => {
    clear();
    dialog.current?.close();
    setMessage('');
    setImage('');
  };
  const render = async () => {
    clear();
    setImage('');
    setProgress(undefined);
    setShowOriginal(false);
    const run = new AbortController();
    job.current = run;
    setMessage('Preparing image...');
    let shot: Shot | undefined;
    try {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
      if (!gpu) throw new Error('WebGPU is unavailable. Open this scene over HTTPS in a WebGPU browser.');
      shot = cameras.get(viewer)?.();
      if (!shot) throw new Error('Wait for the scene to load.');
      if (!(await gpu.requestAdapter())) throw new Error('No compatible graphics device is available.');
      run.signal.throwIfAborted();
      const { renderShot } = await import('./render-shot');
      run.signal.throwIfAborted();
      const canvas = document.createElement('canvas');
      surface.current?.replaceChildren(canvas);
      const { result, original } = await renderShot(canvas, shot, samples, denoise, run.signal, (text, value) => {
        if (!run.signal.aborted) {
          setMessage(text);
          setProgress(value);
        }
      });
      run.signal.throwIfAborted();
      imageUrl.current = URL.createObjectURL(result);
      if (original) originalUrl.current = URL.createObjectURL(original);
      const preview = new Image();
      preview.src = imageUrl.current;
      await preview.decode();
      run.signal.throwIfAborted();
      setImage(imageUrl.current);
      setMessage(original ? 'Denoised image ready' : 'Image ready');
    } catch (error) {
      if (!run.signal.aborted) setMessage(error instanceof Error ? error.message : 'Could not render this image.');
    } finally {
      shot?.dispose();
      if (job.current === run) job.current = null;
    }
  };
  useEffect(() => {
    const subscription = viewer.on$('beauty-shot:open').subscribe(() => {
      if (!ready) return;
      dialog.current?.showModal();
      if (config.layout === 'direct') void render();
    });
    return () => subscription.unsubscribe();
  });
  const busy = Boolean(job.current);
  const selectPreset = (id: string) => {
    const next = config.presets.find((item) => item.id === id);
    if (!next) return;
    setPreset(next);
    setSamples(next.samples);
    setDenoise(next.denoise);
  };
  return (
    <dialog
      className="ds-beauty-dialog"
      aria-labelledby={titleId}
      ref={dialog}
      onCancel={close}
      data-preview={busy || !!image || undefined}
    >
      <header className="ds-beauty-header">
        <h2 id={titleId}>
          <Camera size={19} aria-hidden="true" />
          Beauty shot
        </h2>
        {image && <span>PNG</span>}
      </header>
      {!message && (
        <section className="ds-beauty-settings">
          <div className="ds-beauty-quality">
            <span>Quality</span>
            <SegmentedControl
              label="Quality"
              value={preset.id}
              options={config.presets.map((item) => ({ value: item.id, label: item.label }))}
              onValueChange={selectPreset}
            />
          </div>
          {config.layout === 'details' && (
            <>
              <Field label="Denoise">
                {(id) => <Switch id={id} label="Denoise" checked={denoise} onCheckedChange={setDenoise} />}
              </Field>
              <details>
                <summary>More settings</summary>
                <Field label="Samples">
                  {(id) => (
                    <input
                      id={id}
                      type="number"
                      min="1"
                      max="2048"
                      value={samples}
                      onChange={(event) => setSamples(event.target.valueAsNumber || 0)}
                    />
                  )}
                </Field>
              </details>
            </>
          )}
        </section>
      )}
      <div className="ds-beauty-stage" ref={surface} hidden={!busy} />
      {image && (
        <div className="ds-beauty-stage">
          <img
            src={showOriginal ? originalUrl.current : image}
            alt={showOriginal ? 'Original render' : originalUrl.current ? 'Denoised render' : 'Rendered scene'}
          />
        </div>
      )}
      {message && (
        <section className="ds-beauty-status">
          <div className="ds-beauty-status-line">
            <span role="status">{image ? samples + ' samples' : message}</span>
            {image && originalUrl.current && (
              <SegmentedControl
                label="Compare render"
                value={showOriginal ? 'original' : 'denoised'}
                options={[
                  { value: 'original', label: 'Original' },
                  { value: 'denoised', label: 'Denoised' },
                ]}
                onValueChange={(value) => setShowOriginal(value === 'original')}
              />
            )}
            {busy && progress && <strong>{Math.floor(progress.fraction * 100)}%</strong>}
          </div>
          {busy && (
            <>
              <progress aria-label="Render progress" max={1} value={progress?.fraction} />
              {progress && (
                <small>
                  {message === 'Denoising...'
                    ? 'Finishing image'
                    : progress.seconds === undefined
                      ? 'Estimating time…'
                      : 'About ' + progress.seconds + ' s remaining'}
                </small>
              )}
            </>
          )}
        </section>
      )}
      <footer className="ds-beauty-footer">
        <Button variant="ghost" onClick={close}>
          {busy ? 'Cancel' : 'Back to scene'}
        </Button>
        {!message && (
          <Button disabled={!Number.isInteger(samples) || samples < 1 || samples > 2048} onClick={() => void render()}>
            Render image
          </Button>
        )}
        {image && (
          <a className="ds-button" href={image} download="beauty-shot.png">
            <Download size={16} />
            Save image
          </a>
        )}
      </footer>
    </dialog>
  );
};
