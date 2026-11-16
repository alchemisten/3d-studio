import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useViewer, useViewerState } from '../store';
import { createFrameChain } from './frame-chain';
import { createQualityMonitor, type QualityOptions, type QualityState } from './quality-monitor';

const PROBE_FRAMES = 180;

const isCoarsePointer = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

/**
 * Measures the frame rate of the frames the canvas really renders and keeps `quality` of the viewer store
 * up to date. Frames before the model is shown, frames of a hidden tab and the first frame after an idle
 * refresh are left out. It never requests frames itself. Rendered by `<Viewer>`; use it inside a canvas.
 */
export const QualityWatcher = ({ options }: { options?: QualityOptions }) => {
  const viewer = useViewer();
  const gltf = useViewerState((state) => state.gltf);
  const key = JSON.stringify(options ?? {});
  const monitor = useMemo(() => createQualityMonitor(JSON.parse(key) as QualityOptions, isCoarsePointer()), [key]);
  const chain = useMemo(createFrameChain, []);
  const watching = useRef(0);

  const publish = useMemo(
    () => (next: QualityState) => {
      const previous = viewer.getState().quality;
      if (previous === next) return;
      viewer.setState({ quality: next });
      if (previous.tier !== next.tier)
        viewer.emit('quality:tier-changed', { tier: next.tier, previous: previous.tier, fps: next.fps });
    },
    [viewer],
  );

  useEffect(() => publish(monitor.state), [monitor, publish]);

  useEffect(() => {
    monitor.warmUp();
    chain.interrupt();
  }, [gltf, monitor, chain]);

  useEffect(() => {
    const interrupt = () => chain.interrupt();
    document.addEventListener('visibilitychange', interrupt);
    return () => {
      document.removeEventListener('visibilitychange', interrupt);
      cancelAnimationFrame(watching.current);
      watching.current = 0;
    };
  }, [chain]);

  useFrame(() => {
    if (document.hidden || viewer.getState().status !== 'ready') {
      chain.interrupt();
      return;
    }
    const frameMs = chain.rendered(performance.now());
    if (frameMs !== null) publish(monitor.sample(frameMs));
    if (watching.current) return;
    const watch = () => {
      watching.current = chain.refreshed() ? requestAnimationFrame(watch) : 0;
    };
    watching.current = requestAnimationFrame(watch);
  });

  return null;
};

/**
 * Keeps the canvas rendering while the quality monitor may still raise the tier, so a viewer that renders
 * on demand reaches a tier without the user moving the camera. Stops for good after a bounded number of
 * frames. Use inside a feature scene that depends on `quality.tier`.
 */
export const useQualityProbe = (isActive: boolean): void => {
  const invalidate = useThree((state) => state.invalidate);
  const isPending = useViewerState(
    ({ status, quality }) =>
      isActive && status === 'ready' && !quality.fixed && !quality.demoted && quality.tier === 'off',
  );
  const budget = useRef(PROBE_FRAMES);

  useEffect(() => {
    if (isPending) invalidate();
  }, [isPending, invalidate]);

  useFrame(() => {
    if (!isPending || budget.current <= 0) return;
    budget.current -= 1;
    invalidate();
  });
};
