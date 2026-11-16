import { editorMessagesDe } from './messages-de';
import { editorMessagesEn } from './messages-en';
import type { EditorMessages } from './messages';

export * from './messages';
export { editorMessagesDe, editorMessagesEn };

/** The message sets shipped with the editor by locale. */
export const editorMessages: Record<string, EditorMessages> = { en: editorMessagesEn, de: editorMessagesDe };
