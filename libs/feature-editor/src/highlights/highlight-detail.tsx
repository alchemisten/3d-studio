import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { useViewer, useViewerState } from '@schablone/3d-studio-core';
import { type Highlight, highlightLabel } from '@schablone/3d-studio-feature-highlights';
import {
  Accordion,
  Button,
  ColorSelect,
  Field,
  IconButton,
  SegmentedControl,
  Slider,
  Switch,
} from '@schablone/3d-studio-ui';
import type { Vec3 } from '../camera-bridge';
import { useEditor } from '../editor-context';
import { CommitOnRelease, Hint, NumberInput, Row, Stack, SubViewHeader, TextInput } from '../fields';
import { HighlightActions } from './highlight-actions';
import { localizedValue, partOf, pointerLengthOf, surfacePoint } from './highlight-draft';
import {
  type HighlightEditorConfig,
  highlightEditorStateOf,
  patchHighlightEditorState,
} from './highlight-editor-state';
import { RichTextEditor } from './rich-text-editor';
import type { HighlightEditorApi } from './use-highlight-editor';

export interface HighlightDetailProps {
  editor: HighlightEditorApi;
  highlight: Highlight;
  config: HighlightEditorConfig;
}

const DEFAULT_COLOR = '#111111';
const AXES = ['X', 'Y', 'Z'] as const;
const LENGTH_STEPS = 100;

/** A round step of about a hundredth of the model's size, e.g. 0.01 for a model of two metres. */
const positionStep = (modelSize: number): number => 10 ** Math.floor(Math.log10(Math.max(modelSize, 1e-6) / 100));

/** The selected highlight: its text, actions, appearance, pointer, part, shot and position in sections. */
export const HighlightDetail = ({ editor, highlight, config }: HighlightDetailProps) => {
  const viewer = useViewer();
  const { t, flush } = useEditor();
  const { shots, focusTitleId } = useViewerState(highlightEditorStateOf);
  const { locales, items, resolve, mode } = editor;
  const [locale, setLocale] = useState(locales[0]);
  const { id } = highlight;
  const index = items.indexOf(highlight);
  const title = highlightLabel(highlight, locales[0]);
  const length = pointerLengthOf(highlight, resolve);
  const part = partOf(highlight);
  const point = surfacePoint(highlight, resolve);
  const shot = shots[id];
  const color = highlight.color ?? DEFAULT_COLOR;

  useEffect(() => {
    if (focusTitleId === id) patchHighlightEditorState(viewer, { focusTitleId: undefined });
  }, [focusTitleId, id, viewer]);

  const setAxis = (axis: number, value: number) =>
    editor.place(id, point.map((current, at) => (at === axis ? value : current)) as Vec3, highlight.normal, {
      transient: true,
    });

  const localeTabs = locales.length > 1 && (
    <SegmentedControl
      label={t('highlights.language')}
      value={locale}
      options={locales.map((value) => ({ value, label: value.toUpperCase() }))}
      onValueChange={setLocale}
      testId="ds-highlight-locale"
    />
  );

  return (
    <Stack>
      <SubViewHeader
        back={t('highlights.back')}
        onBack={() => editor.select(undefined)}
        title={`${index + 1}. ${title}`}
        actions={
          <>
            <IconButton
              label={t('highlights.previous')}
              icon={<ChevronLeft size={16} aria-hidden="true" />}
              disabled={items.length < 2}
              onClick={() => editor.step(-1)}
            />
            <IconButton
              label={t('highlights.next')}
              icon={<ChevronRight size={16} aria-hidden="true" />}
              disabled={items.length < 2}
              onClick={() => editor.step(1)}
            />
          </>
        }
      />
      <Accordion
        className="ds-editor-sections"
        testId="ds-highlight-sections"
        defaultOpen={['text']}
        sections={[
          {
            value: 'text',
            title: t('highlights.texts'),
            content: (
              <Stack>
                {localeTabs}
                <Field label={t('highlights.title')} orientation="vertical">
                  {(fieldId) => (
                    <TextInput
                      id={fieldId}
                      value={localizedValue(highlight.label, locale, locales)}
                      required={locale === locales[0]}
                      focused={focusTitleId === id}
                      testId="ds-highlight-title"
                      onValueChange={(text) => editor.setText(id, 'label', locale, text)}
                      onCommit={flush}
                    />
                  )}
                </Field>
                <RichTextEditor
                  key={locale}
                  label={t('highlights.text')}
                  value={localizedValue(highlight.description, locale, locales)}
                  testId="ds-highlight-text"
                  onValueChange={(text) => editor.setText(id, 'description', locale, text)}
                  onCommit={flush}
                />
              </Stack>
            ),
          },
          {
            value: 'actions',
            title: t('highlights.actions'),
            content: (
              <Stack>
                {localeTabs}
                <HighlightActions editor={editor} highlight={highlight} locale={locale} />
              </Stack>
            ),
          },
          {
            value: 'appearance',
            title: t('highlights.appearance'),
            content: (
              <Stack>
                <Field label={t('highlights.color')} orientation="vertical">
                  {() => (
                    <CommitOnRelease onCommit={flush}>
                      <ColorSelect
                        label={t('highlights.color')}
                        value={color}
                        colors={config.colors.includes(color) ? config.colors : [...config.colors, color]}
                        custom
                        testId="ds-highlight-color"
                        onValueChange={(next) => editor.setColor(id, next.toLowerCase())}
                      />
                    </CommitOnRelease>
                  )}
                </Field>
                <Field label={t('highlights.glow')}>
                  {(fieldId) => (
                    <Switch
                      id={fieldId}
                      label={t('highlights.glow')}
                      checked={part !== undefined}
                      onCheckedChange={(checked) => editor.attachPart(id, checked ? 'auto' : undefined)}
                    />
                  )}
                </Field>
              </Stack>
            ),
          },
          {
            value: 'pointer',
            title: t('highlights.pointer'),
            content: (
              <Stack>
                <Field label={t('highlights.pointer.enabled')}>
                  {(fieldId) => (
                    <Switch
                      id={fieldId}
                      label={t('highlights.pointer.enabled')}
                      checked={length > 0}
                      onCheckedChange={(checked) => editor.setLength(id, checked ? editor.defaultLength : 0)}
                    />
                  )}
                </Field>
                {length > 0 && (
                  <>
                    <Field label={t('highlights.pointer.length')} orientation="vertical">
                      {() => (
                        <CommitOnRelease onCommit={flush}>
                          <Slider
                            label={t('highlights.pointer.length')}
                            value={Math.min(length, editor.maxLength)}
                            min={editor.maxLength / LENGTH_STEPS}
                            max={editor.maxLength}
                            step={editor.maxLength / LENGTH_STEPS}
                            onValueChange={(next) => editor.setLength(id, next, { transient: true })}
                          />
                        </CommitOnRelease>
                      )}
                    </Field>
                    <Row>
                      <Button variant="ghost" onClick={() => editor.resetPointer(id)}>
                        {t('highlights.pointer.reset')}
                      </Button>
                      <Button
                        variant="ghost"
                        active={mode === 'pointer'}
                        onClick={() => editor.setMode(mode === 'pointer' ? undefined : 'pointer')}
                      >
                        {t('highlights.pointer.free')}
                      </Button>
                    </Row>
                  </>
                )}
              </Stack>
            ),
          },
          {
            value: 'part',
            title: t('highlights.part'),
            content: (
              <Stack>
                {part ? (
                  <span className="ds-editor-chip" data-testid="ds-highlight-part">
                    {part}
                    <button
                      type="button"
                      className="ds-editor-chip__remove"
                      aria-label={t('highlights.part.detach', { name: part })}
                      onClick={() => editor.attachPart(id, undefined)}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </span>
                ) : (
                  <Hint>{t('highlights.part.none')}</Hint>
                )}
                <Row>
                  <Button
                    active={mode === 'pick-part'}
                    onClick={() => editor.setMode(mode === 'pick-part' ? undefined : 'pick-part')}
                  >
                    {t('highlights.part.pick')}
                  </Button>
                </Row>
              </Stack>
            ),
          },
          {
            value: 'shot',
            title: t('highlights.shot'),
            content: (
              <Stack>
                {shot && highlight.camera ? (
                  <img className="ds-editor-shot" src={shot} alt={t('highlights.shot.preview', { name: title })} />
                ) : (
                  <Hint>{t(highlight.camera ? 'highlights.shot.rendering' : 'highlights.shot.none')}</Hint>
                )}
                <Row>
                  <Button data-testid="ds-highlight-shot-capture" onClick={() => editor.captureShot(id)}>
                    {t('highlights.shot.capture')}
                  </Button>
                  <Button active={mode === 'shot'} onClick={() => editor.setMode(mode === 'shot' ? undefined : 'shot')}>
                    {t('highlights.shot.look')}
                  </Button>
                  {highlight.camera && (
                    <Button variant="ghost" onClick={() => editor.setShot(id, undefined)}>
                      {t('highlights.shot.clear')}
                    </Button>
                  )}
                </Row>
              </Stack>
            ),
          },
          {
            value: 'position',
            title: t('highlights.position'),
            content: (
              <div className="ds-editor-axes">
                {AXES.map((axis, at) => (
                  <Field key={axis} label={axis}>
                    {(fieldId) => (
                      <span className="ds-editor-unit">
                        <NumberInput
                          id={fieldId}
                          value={point[at]}
                          step={positionStep(editor.modelSize)}
                          onValueChange={(value) => setAxis(at, value)}
                          onCommit={flush}
                        />
                        <abbr title={t('highlights.position.unit')}>m</abbr>
                      </span>
                    )}
                  </Field>
                ))}
              </div>
            ),
          },
        ]}
      />
      <Row>
        <Button
          variant="ghost"
          icon={<Trash2 size={16} aria-hidden="true" />}
          data-testid="ds-highlight-remove"
          onClick={() => editor.remove(id)}
        >
          {t('highlights.remove')}
        </Button>
      </Row>
    </Stack>
  );
};
