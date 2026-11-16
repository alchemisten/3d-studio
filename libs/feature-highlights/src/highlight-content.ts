import type { PhrasingContent, Root, RootContent } from 'mdast';
import {
  directiveFromMarkdown,
  directiveToMarkdown,
  type LeafDirective,
  type TextDirective,
} from 'mdast-util-directive';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { directive } from 'micromark-extension-directive';

/**
 * An interactive element in a highlight's text, written as the Markdown directive
 * `::action[Label]{type="…" …}`.
 */
export type ContentAction =
  /** Focuses another highlight: its id, or `next` / `previous` in list order. */
  | { type: 'highlight'; label: string; target: string }
  | { type: 'link'; label: string; href: string }
  /** Switches the model to a material variant (material-variants feature). */
  | { type: 'variant'; label: string; name: string }
  /** Plays an animation clip from its start (animation feature). */
  | { type: 'animation'; label: string; clip: string }
  /** Shows a model tool right in the card, e.g. a colour picker; `id` is the tool id. */
  | { type: 'tool'; label: string; id: string };

export type ContentActionType = ContentAction['type'];

export const CONTENT_ACTION_TYPES: readonly ContentActionType[] = ['highlight', 'link', 'variant', 'animation', 'tool'];

export type DirectiveNode = LeafDirective | TextDirective;

/** Name of the attribute that carries the subject of each action type. */
const SUBJECT = { highlight: 'target', link: 'href', variant: 'name', animation: 'clip', tool: 'id' } as const;

const ACTION = 'action';
const VIDEO = 'video';

/** Parses highlight Markdown, including `::video{…}` and `::action[…]{…}` directives. */
export const parseContent = (markdown: string): Root =>
  fromMarkdown(markdown, { extensions: [directive()], mdastExtensions: [directiveFromMarkdown()] });

/** Writes a content tree back to Markdown. */
export const serializeContent = (root: Root): string =>
  toMarkdown(root, { extensions: [directiveToMarkdown({ preferShortcut: false })], bullet: '-', emphasis: '_' }).trim();

const SAFE_SCHEME = /^(https?:|mailto:)/i;
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** A URL that is safe to link or load: http, https, mailto or relative; `undefined` for anything else. */
export const sanitizeUrl = (url: string | null | undefined): string | undefined => {
  const trimmed = url?.trim();
  if (!trimmed || trimmed.startsWith('//')) return undefined;
  return SAFE_SCHEME.test(trimmed) || !ANY_SCHEME.test(trimmed) ? trimmed : undefined;
};

const textOf = (nodes: readonly PhrasingContent[]): string =>
  nodes.map((node) => ('value' in node ? node.value : 'children' in node ? textOf(node.children) : '')).join('');

export const isDirective = (node: { type: string }): node is DirectiveNode =>
  node.type === 'leafDirective' || node.type === 'textDirective';

/** The action a directive describes; `undefined` for other directives and unknown or incomplete actions. */
export const actionOf = (node: DirectiveNode): ContentAction | undefined => {
  const { type, ...attributes } = node.attributes ?? {};
  if (node.name !== ACTION || !type || !CONTENT_ACTION_TYPES.some((known) => known === type)) return undefined;
  const key = SUBJECT[type as ContentActionType];
  const subject = attributes[key];
  return subject ? ({ type, label: textOf(node.children), [key]: subject } as ContentAction) : undefined;
};

/** The directive that writes an action into the text. */
export const actionNode = (action: ContentAction): LeafDirective => {
  const key = SUBJECT[action.type];
  const subject = (action as unknown as Record<string, string>)[key];
  return {
    type: 'leafDirective',
    name: ACTION,
    attributes: { type: action.type, [key]: subject },
    children: action.label ? [{ type: 'text', value: action.label }] : [],
  };
};

/** The source of a `::video{src="…"}` directive; `undefined` for other directives. */
export const videoSourceOf = (node: DirectiveNode): string | undefined =>
  node.name === VIDEO ? (node.attributes?.src ?? undefined) : undefined;

export const videoNode = (src: string): LeafDirective => ({
  type: 'leafDirective',
  name: VIDEO,
  attributes: { src },
  children: [],
});

export type VideoEmbed = { kind: 'frame'; src: string } | { kind: 'file'; src: string };

const YOUTUBE =
  /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i;
const VIMEO = /^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d+)/i;

/** How a video URL is embedded: YouTube and Vimeo as privacy-friendly frames, other safe URLs as files. */
export const videoEmbedOf = (src: string): VideoEmbed | undefined => {
  const url = sanitizeUrl(src);
  if (!url) return undefined;
  const youtube = YOUTUBE.exec(url)?.[1];
  if (youtube) return { kind: 'frame', src: `https://www.youtube-nocookie.com/embed/${youtube}` };
  const vimeo = VIMEO.exec(url)?.[1];
  if (vimeo) return { kind: 'frame', src: `https://player.vimeo.com/video/${vimeo}?dnt=1` };
  return { kind: 'file', src: url };
};

const isActionBlock = (node: RootContent): node is LeafDirective =>
  node.type === 'leafDirective' && actionOf(node) !== undefined;

/** The block-level actions of a text, in order. */
export const contentActions = (markdown: string): ContentAction[] =>
  parseContent(markdown).children.flatMap((node) => (isActionBlock(node) ? (actionOf(node) ?? []) : []));

const withBlocks = (markdown: string, change: (blocks: RootContent[], actionAt: number[]) => RootContent[]): string => {
  const root = parseContent(markdown);
  const actionAt = root.children.flatMap((node, index) => (isActionBlock(node) ? index : []));
  return serializeContent({ ...root, children: change(root.children, actionAt) });
};

/** Appends an action to the end of a text. */
export const addContentAction = (markdown: string, action: ContentAction): string =>
  withBlocks(markdown, (blocks) => [...blocks, actionNode(action)]);

/** Replaces the action at `index` (counted among the actions). */
export const replaceContentAction = (markdown: string, index: number, action: ContentAction): string =>
  withBlocks(markdown, (blocks, actionAt) =>
    blocks.map((block, at) => (at === actionAt[index] ? actionNode(action) : block)),
  );

export const removeContentAction = (markdown: string, index: number): string =>
  withBlocks(markdown, (blocks, actionAt) => blocks.filter((_block, at) => at !== actionAt[index]));

/** Swaps the action at `index` with the one `delta` actions away; out-of-range moves change nothing. */
export const moveContentAction = (markdown: string, index: number, delta: number): string =>
  withBlocks(markdown, (blocks, actionAt) => {
    const from = actionAt[index];
    const to = actionAt[index + delta];
    if (from === undefined || to === undefined) return blocks;
    return blocks.map((block, at) => (at === from ? blocks[to] : at === to ? blocks[from] : block));
  });
