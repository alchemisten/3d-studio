import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { FeatureInput, ViewerStore } from '@schablone/3d-studio-core';
import { type EditorHistory, emptyHistory, pushHistory, redoHistory, undoHistory } from './editor-history';
import { applyEditorChange, type EditorChange, type EditorValue } from './editor-value';
import { createTranslate, editorMessages, type EditorMessages, type Translate } from './messages';
import { applyLocale, applyRuntimeOverrides, defaultRuntimeOverrides, type RuntimeOverride } from './runtime-overrides';

declare module '@schablone/3d-studio-core' {
  interface ViewerEventMap {
    /** Emitted for every finished edit, next to the host's `onChange`. */
    'editor:change': EditorChange;
  }
}

export interface EmitOptions {
  /**
   * The edit is still in progress (a drag, typing): it shows live but is neither reported nor undoable
   * until `flush()` finishes it or `discard()` drops it.
   */
  transient?: boolean;
}

export interface EditorContextValue {
  /** The value as it shows right now, including an edit in progress. */
  value: EditorValue;
  /** Applies a change. Finished changes are reported to the host and recorded for undo. */
  emit: (change: EditorChange, options?: EmitOptions) => void;
  /** Finishes the edit in progress as one change and one undo entry. */
  flush: () => void;
  /** Drops the edit in progress. */
  discard: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  t: Translate;
  /** Locale of the editor UI. */
  locale: string;
  /** Every feature of the edited viewer, including the editor's own. */
  features: readonly FeatureInput[];
  /** What the viewport runs differently from the stored config. */
  overrides: readonly RuntimeOverride[];
  /** The feature config for the viewport: the shown value in the editor's locale with the overrides applied. */
  viewerFeatureConfig: Record<string, unknown>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export interface EditorProviderProps {
  value: EditorValue;
  /**
   * Receives the next value after every finished edit (drag end, blur, toggle, undo), never while one is
   * in progress. The host stores it (autosave) and passes it back as `value`.
   */
  onChange: (value: EditorValue, change: EditorChange) => void;
  /** The store of the edited viewer; finished changes are also emitted on it as `editor:change`. */
  store?: ViewerStore;
  features?: readonly FeatureInput[];
  /** Locale of the editor UI; picks a shipped message set (`en`, `de`). */
  locale?: string;
  /** Overrides single messages or supplies a whole locale. */
  messages?: Partial<EditorMessages>;
  /** Behaviour switched off in the editing viewport; defaults to `defaultRuntimeOverrides`. */
  overrides?: readonly RuntimeOverride[];
  children?: ReactNode;
}

const NO_FEATURES: readonly FeatureInput[] = [];

/** Holds the controlled editor value, the edit in progress and the undo history for the editor beneath it. */
export const EditorProvider = ({
  value,
  onChange,
  store,
  features = NO_FEATURES,
  locale = 'en',
  messages,
  overrides = defaultRuntimeOverrides,
  children,
}: EditorProviderProps) => {
  const [draft, setDraft] = useState<{ value: EditorValue; change: EditorChange } | null>(null);
  const [history, setHistory] = useState<EditorHistory>(emptyHistory);
  const latest = useRef({ value, draft, history, onChange });
  latest.current = { value, draft, history, onChange };

  const commit = useCallback(
    (next: EditorValue, change: EditorChange, nextHistory: EditorHistory) => {
      latest.current = { ...latest.current, value: next, draft: null, history: nextHistory };
      setDraft(null);
      setHistory(nextHistory);
      latest.current.onChange(next, change);
      store?.emit('editor:change', change);
    },
    [store],
  );

  const emit = useCallback(
    (change: EditorChange, options?: EmitOptions) => {
      const current = latest.current;
      const next = applyEditorChange(current.draft?.value ?? current.value, change);
      if (options?.transient) {
        latest.current = { ...current, draft: { value: next, change } };
        setDraft(latest.current.draft);
      } else {
        commit(next, change, pushHistory(current.history, current.value));
      }
    },
    [commit],
  );

  const flush = useCallback(() => {
    const { draft: pending, history: past, value: committed } = latest.current;
    if (pending) commit(pending.value, pending.change, pushHistory(past, committed));
  }, [commit]);

  const discard = useCallback(() => {
    latest.current = { ...latest.current, draft: null };
    setDraft(null);
  }, []);

  const step = useCallback(
    (move: typeof undoHistory) => {
      const moved = move(latest.current.history, latest.current.value);
      if (moved) commit(moved.value, { type: 'restore', value: moved.value }, moved.history);
    },
    [commit],
  );
  const undo = useCallback(() => step(undoHistory), [step]);
  const redo = useCallback(() => step(redoHistory), [step]);

  const shown = draft?.value ?? value;
  const t = useMemo(() => createTranslate({ ...editorMessages[locale], ...messages }), [locale, messages]);
  const viewerFeatureConfig = useMemo(
    () => applyRuntimeOverrides(applyLocale(shown.featureConfig, locale), overrides),
    [shown.featureConfig, locale, overrides],
  );
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const context = useMemo(
    () => ({
      value: shown,
      emit,
      flush,
      discard,
      undo,
      redo,
      canUndo,
      canRedo,
      t,
      locale,
      features,
      overrides,
      viewerFeatureConfig,
    }),
    [shown, emit, flush, discard, undo, redo, canUndo, canRedo, t, locale, features, overrides, viewerFeatureConfig],
  );

  return <EditorContext.Provider value={context}>{children}</EditorContext.Provider>;
};

/** The shown value, the change emitter, the undo history and the translator of the surrounding editor. */
export const useEditor = (): EditorContextValue => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used inside <Editor> or <EditorProvider>.');
  }
  return context;
};

const fallbackTranslate = createTranslate();

/** The editor's translator; English outside an editor, so the shell works on its own. */
export const useEditorTranslate = (): Translate => useContext(EditorContext)?.t ?? fallbackTranslate;
