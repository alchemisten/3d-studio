import { editorMessagesEn } from './messages-en';

export type EditorMessageKey = keyof typeof editorMessagesEn;

export type EditorMessages = Record<EditorMessageKey, string>;

export type MessageValues = Record<string, string | number>;

/** Resolves a message key; unknown keys are returned as they are, so literal labels pass through. */
export type Translate = (key: string, values?: MessageValues) => string;

const PLACEHOLDER = /\{(\w+)\}/g;

export const formatMessage = (template: string, values: MessageValues = {}): string =>
  template.replace(PLACEHOLDER, (match, name: string) => (name in values ? String(values[name]) : match));

/** Builds a translator over `messages`, falling back to English and then to the key itself. */
export const createTranslate = (messages: Partial<Record<string, string>> = {}): Translate => {
  const fallback: Partial<Record<string, string>> = editorMessagesEn;
  return (key, values) => formatMessage(messages[key] ?? fallback[key] ?? key, values);
};
