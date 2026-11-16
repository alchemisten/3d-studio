import type { EditorValue } from './editor-value';

/** Undo and redo stacks of finished edits; the newest entry is last. */
export interface EditorHistory {
  past: EditorValue[];
  future: EditorValue[];
}

export const emptyHistory: EditorHistory = { past: [], future: [] };

const HISTORY_LIMIT = 100;

/** Records the value an edit replaced; a new edit drops everything that could be redone. */
export const pushHistory = (history: EditorHistory, before: EditorValue, limit = HISTORY_LIMIT): EditorHistory => ({
  past: [...history.past, before].slice(-limit),
  future: [],
});

/** Steps back: the value to restore and the history after it; `undefined` when nothing can be undone. */
export const undoHistory = (
  history: EditorHistory,
  current: EditorValue,
): { history: EditorHistory; value: EditorValue } | undefined => {
  const value = history.past.at(-1);
  return value && { value, history: { past: history.past.slice(0, -1), future: [...history.future, current] } };
};

/** Steps forward again; `undefined` when nothing can be redone. */
export const redoHistory = (
  history: EditorHistory,
  current: EditorValue,
): { history: EditorHistory; value: EditorValue } | undefined => {
  const value = history.future.at(-1);
  return value && { value, history: { past: [...history.past, current], future: history.future.slice(0, -1) } };
};
