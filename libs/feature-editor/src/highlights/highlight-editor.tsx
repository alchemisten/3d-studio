import { MapPin } from 'lucide-react';
import { defineFeature } from '@schablone/3d-studio-core';
import { editorTabSlots } from '../shell/editor-tab';
import { HighlightDetail } from './highlight-detail';
import { type HighlightEditorConfig, highlightEditorConfig, HIGHLIGHTS_TAB_ID } from './highlight-editor-state';
import { HighlightList } from './highlight-list';
import { HighlightOverlay } from './highlight-overlay';
import { HighlightEditorScene } from './highlight-scene';
import { useHighlightEditor } from './use-highlight-editor';

/** The highlights tab: the list, or the detail of the selected highlight in its place. */
export const HighlightPanel = ({ config }: { config: HighlightEditorConfig }) => {
  const editor = useHighlightEditor(config);
  return editor.selected ? (
    <HighlightDetail key={editor.selected.id} editor={editor} highlight={editor.selected} config={config} />
  ) : (
    <HighlightList editor={editor} />
  );
};

/**
 * Editor tab that authors the config of the `highlights` feature: a list in narrative order, a detail view
 * per highlight, and direct manipulation in the viewport (drag the hotspot along the surface, drag the
 * pointer end, pick a part, frame the shot). Finished edits are reported as `{ type: 'highlights' }`.
 * Usage: `highlightEditor.use({ locales: ['de', 'en'] })`.
 */
export const highlightEditor = defineFeature<HighlightEditorConfig>({
  id: 'highlight-editor',
  config: highlightEditorConfig,
  scene: HighlightEditorScene,
  slots: ({ config }) => ({
    'viewer.layer': { mode: 'append', order: 10, content: <HighlightOverlay config={config} /> },
    ...editorTabSlots({
      id: HIGHLIGHTS_TAB_ID,
      label: 'highlights.tool',
      icon: <MapPin size={18} aria-hidden="true" />,
      order: 20,
      panel: <HighlightPanel config={config} />,
    }),
  }),
});
