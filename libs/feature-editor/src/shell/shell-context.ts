import { createContext, type ReactNode, useContext } from 'react';
import type { EditorNav } from '../editor-nav';

export interface EditorTabDefinition {
  id: string;
  /** Message key or literal text. */
  label: string;
  icon?: ReactNode;
  /** Position among the tabs when the host gives no `tabOrder`; lower first. */
  order?: number;
  /** Content of the sidebar while the tab is open. */
  panel: ReactNode;
}

export interface EditorShellContextValue {
  /** The current nav; `tool` is resolved to an existing tab. */
  nav: EditorNav;
  /** Merges a patch into the nav; `undefined` entries are removed. */
  navigate: (patch: Partial<EditorNav>) => void;
  /** Adds a tab for as long as the returned function is not called; re-registering an id replaces it. */
  registerTab: (tab: EditorTabDefinition) => () => void;
}

export const EditorShellContext = createContext<EditorShellContextValue | null>(null);

/** The nav of the surrounding `<EditorShell>`. */
export const useEditorShell = (): EditorShellContextValue => {
  const context = useContext(EditorShellContext);
  if (!context) {
    throw new Error('Editor tabs must be rendered inside <EditorShell>.');
  }
  return context;
};

/** The current nav and its setter. */
export const useEditorNav = (): Pick<EditorShellContextValue, 'nav' | 'navigate'> => {
  const { nav, navigate } = useEditorShell();
  return { nav, navigate };
};
