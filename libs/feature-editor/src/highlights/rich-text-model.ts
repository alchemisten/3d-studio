import type { BlockContent, DefinitionContent, Link, ListItem, PhrasingContent, Root, RootContent } from 'mdast';
import {
  actionNode,
  actionOf,
  type ContentAction,
  parseContent,
  serializeContent,
  videoNode,
  videoSourceOf,
} from '@schablone/3d-studio-feature-highlights';

/** A node of the rich-text document, in the JSON shape TipTap reads and writes. */
export interface DocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

type Mark = NonNullable<DocNode['marks']>[number];
type Block = BlockContent | DefinitionContent | RootContent;

const HEADING_LEVEL = 3;

const rawBlock = (node: RootContent): DocNode => ({
  type: 'rawBlock',
  attrs: { markdown: serializeContent({ type: 'root', children: [node] }) },
});

const inlineOf = (nodes: readonly PhrasingContent[], marks: Mark[] = []): DocNode[] =>
  nodes.flatMap((node): DocNode[] => {
    switch (node.type) {
      case 'text':
        return node.value ? [{ type: 'text', text: node.value, ...(marks.length ? { marks } : {}) }] : [];
      case 'strong':
        return inlineOf(node.children, [...marks, { type: 'bold' }]);
      case 'emphasis':
        return inlineOf(node.children, [...marks, { type: 'italic' }]);
      case 'link':
        return inlineOf(node.children, [...marks, { type: 'link', attrs: { href: node.url } }]);
      case 'break':
        return [{ type: 'hardBreak' }];
      case 'image':
        return [{ type: 'image', attrs: { src: node.url, alt: node.alt ?? '' } }];
      case 'inlineCode':
        return [{ type: 'text', text: node.value, ...(marks.length ? { marks } : {}) }];
      default:
        return 'children' in node ? inlineOf(node.children as PhrasingContent[], marks) : [];
    }
  });

const paragraphOf = (children: readonly PhrasingContent[]): DocNode => {
  const content = inlineOf(children);
  return content.length ? { type: 'paragraph', content } : { type: 'paragraph' };
};

const blockOf = (node: Block): DocNode[] => {
  switch (node.type) {
    case 'paragraph':
      return [paragraphOf(node.children)];
    case 'heading':
      return [{ type: 'heading', attrs: { level: HEADING_LEVEL }, content: inlineOf(node.children) }];
    case 'list':
      return [
        {
          type: node.ordered ? 'orderedList' : 'bulletList',
          ...(node.ordered ? { attrs: { start: node.start ?? 1 } } : {}),
          content: node.children.map((item) => ({ type: 'listItem', content: item.children.flatMap(blockOf) })),
        },
      ];
    case 'leafDirective': {
      const video = videoSourceOf(node);
      if (video !== undefined) return [{ type: 'videoBlock', attrs: { src: video } }];
      const action = actionOf(node);
      return [action ? { type: 'actionChip', attrs: { action } } : rawBlock(node)];
    }
    default:
      return [rawBlock(node as RootContent)];
  }
};

/** The rich-text document of a highlight's Markdown. Anything the editor cannot edit is kept as a raw block. */
export const markdownToDoc = (markdown: string): DocNode => {
  const content = parseContent(markdown).children.flatMap(blockOf);
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
};

const hrefOf = (node: DocNode): string | undefined =>
  node.marks?.find((mark) => mark.type === 'link')?.attrs?.href as string | undefined;

const has = (node: DocNode, mark: string): boolean => Boolean(node.marks?.some((entry) => entry.type === mark));

const phrasingOf = (node: DocNode): PhrasingContent => {
  if (node.type === 'hardBreak') return { type: 'break' };
  if (node.type === 'image') {
    return { type: 'image', url: String(node.attrs?.src ?? ''), alt: String(node.attrs?.alt ?? '') };
  }
  const text: PhrasingContent = { type: 'text', value: node.text ?? '' };
  const emphasized: PhrasingContent = has(node, 'italic') ? { type: 'emphasis', children: [text] } : text;
  return has(node, 'bold') ? { type: 'strong', children: [emphasized] } : emphasized;
};

const phrasingsOf = (nodes: readonly DocNode[] = []): PhrasingContent[] =>
  nodes.reduce<PhrasingContent[]>((result, node) => {
    const href = hrefOf(node);
    const previous = result.at(-1);
    if (href === undefined) return [...result, phrasingOf(node)];
    const child = phrasingOf(node) as Link['children'][number];
    return previous?.type === 'link' && previous.url === href
      ? [...result.slice(0, -1), { ...previous, children: [...previous.children, child] }]
      : [...result, { type: 'link', url: href, children: [child] }];
  }, []);

const blocksOf = (nodes: readonly DocNode[] = []): RootContent[] =>
  nodes.flatMap((node): RootContent[] => {
    switch (node.type) {
      case 'paragraph':
        return node.content?.length ? [{ type: 'paragraph', children: phrasingsOf(node.content) }] : [];
      case 'heading':
        return [{ type: 'heading', depth: HEADING_LEVEL, children: phrasingsOf(node.content) }];
      case 'bulletList':
      case 'orderedList':
        return [
          {
            type: 'list',
            ordered: node.type === 'orderedList',
            start: node.type === 'orderedList' ? Number(node.attrs?.start ?? 1) : null,
            spread: false,
            children: (node.content ?? []).map((item): ListItem => ({
              type: 'listItem',
              spread: false,
              children: blocksOf(item.content) as ListItem['children'],
            })),
          },
        ];
      case 'videoBlock':
        return [videoNode(String(node.attrs?.src ?? ''))];
      case 'actionChip':
        return [actionNode(node.attrs?.action as ContentAction)];
      case 'rawBlock':
        return parseContent(String(node.attrs?.markdown ?? '')).children;
      default:
        return [];
    }
  });

/** The Markdown of a rich-text document; an empty document is an empty string. */
export const docToMarkdown = (doc: DocNode): string => {
  const root: Root = { type: 'root', children: blocksOf(doc.content) };
  return root.children.length ? serializeContent(root) : '';
};
