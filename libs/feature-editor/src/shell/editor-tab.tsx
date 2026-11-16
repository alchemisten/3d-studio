import { type ReactNode, useEffect, useMemo } from 'react';
import { useViewer, ViewerContext } from '@schablone/3d-studio-core';
import { Slot, type SlotFillsInput } from '@schablone/3d-studio-ui';
import { type EditorTabDefinition, useEditorShell } from './shell-context';

declare module '@schablone/3d-studio-ui' {
  interface SlotMap {
    /** Sidebar tabs of the editor; fill with `<EditorTab>` (see `editorTabSlots`). */
    'editor.tabs': Record<string, never>;
  }
}

/**
 * Adds a sidebar tab from inside the viewer. The panel is rendered by the shell, outside the viewer's DOM
 * and theme, but keeps access to the viewer store.
 */
export const EditorTab = ({ id, label, icon, order, panel }: EditorTabDefinition) => {
  const { registerTab } = useEditorShell();
  const viewer = useViewer();
  const content = useMemo(
    () => <ViewerContext.Provider value={viewer}>{panel}</ViewerContext.Provider>,
    [viewer, panel],
  );
  useEffect(
    () => registerTab({ id, label, icon, order, panel: content }),
    [registerTab, id, label, icon, order, content],
  );
  return null;
};

/** Slot fills that add a sidebar tab to the editor. Use as (part of) a feature's `slots`. */
export const editorTabSlots = (tab: EditorTabDefinition): SlotFillsInput => ({
  'editor.tabs': { mode: 'append', order: tab.order ?? 0, content: <EditorTab {...tab} /> },
});

/**
 * Collects the tabs contributed by editor features for the surrounding `<EditorShell>`.
 * Place it inside the `<Viewer>` (as a child), where the features' slots live.
 */
export const EditorSlots = (): ReactNode => <Slot name="editor.tabs" />;
