import { Fragment, type ReactNode, useContext, useMemo } from 'react';
import type { Nodes } from 'mdast';
import { ModelToolContext, useViewer, useViewerState, type ViewerStore } from '@schablone/3d-studio-core';
import {
  actionOf,
  type ContentAction,
  type DirectiveNode,
  isDirective,
  parseContent,
  sanitizeUrl,
  videoEmbedOf,
  videoSourceOf,
} from './highlight-content';
import type { Highlight } from './highlight-model';

declare module '@schablone/3d-studio-core' {
  interface ViewerEventMap {
    /** Emitted when a content action of a highlight is used, before it takes effect. */
    'highlight:action': { highlightId: string; action: ContentAction };
  }
}

export interface HighlightContentViewProps {
  /** The highlight's text as Markdown. */
  markdown: string;
  highlight: Highlight;
  /** The highlights in list order, for `next` and `previous`. */
  highlights: readonly Highlight[];
}

interface VariantState {
  names: string[];
  selected: string | null;
}

const VARIANTS = 'material-variant';

const targetOf = (target: string, highlight: Highlight, highlights: readonly Highlight[]): string | undefined => {
  if (target !== 'next' && target !== 'previous')
    return highlights.some((entry) => entry.id === target) ? target : undefined;
  const index = highlights.indexOf(highlight);
  const step = target === 'next' ? 1 : -1;
  return highlights.length > 1 ? highlights[(index + step + highlights.length) % highlights.length].id : undefined;
};

const run = (viewer: ViewerStore, action: ContentAction, highlight: Highlight, highlights: readonly Highlight[]) => {
  viewer.emit('highlight:action', { highlightId: highlight.id, action });
  if (action.type === 'highlight') {
    const id = targetOf(action.target, highlight, highlights);
    if (id) viewer.emit('highlight:focus', { id });
  } else if (action.type === 'variant') {
    const state = viewer.getState().featureState[VARIANTS] as VariantState | undefined;
    if (state?.names.includes(action.name)) viewer.setFeatureState(VARIANTS, { ...state, selected: action.name });
  } else if (action.type === 'animation') {
    viewer.emit('animation:seek', { clip: action.clip, time: 0 });
    viewer.emit('animation:play', { clip: action.clip });
  }
};

const ToolWidget = ({ id }: { id: string }) => {
  const tool = useContext(ModelToolContext)?.get(id);
  const available = useViewerState((state) => tool?.available(state) ?? false);
  return tool && available ? <div className="ds-highlight-content__tool">{tool.render('inline')}</div> : null;
};

interface ActionProps extends Omit<HighlightContentViewProps, 'markdown'> {
  action: ContentAction;
}

const ActionWidget = ({ action, highlight, highlights }: ActionProps) => {
  const viewer = useViewer();
  if (action.type === 'tool') return <ToolWidget id={action.id} />;
  if (action.type === 'link') {
    const href = sanitizeUrl(action.href);
    return href ? (
      <a
        className="ds-highlight-detail__action"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => viewer.emit('highlight:action', { highlightId: highlight.id, action })}
      >
        {action.label || href}
      </a>
    ) : null;
  }
  return (
    <button
      type="button"
      className="ds-highlight-detail__action"
      data-action={action.type}
      onClick={() => run(viewer, action, highlight, highlights)}
    >
      {action.label}
    </button>
  );
};

const Video = ({ src }: { src: string }) => {
  const embed = videoEmbedOf(src);
  if (!embed) return null;
  return embed.kind === 'frame' ? (
    <iframe
      className="ds-highlight-content__video"
      src={embed.src}
      title="Video"
      loading="lazy"
      allow="fullscreen; picture-in-picture; encrypted-media"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  ) : (
    <video className="ds-highlight-content__video" src={embed.src} controls preload="none">
      <track kind="captions" />
    </video>
  );
};

type Context = Omit<HighlightContentViewProps, 'markdown'>;

const renderDirective = (node: DirectiveNode, context: Context): ReactNode => {
  const video = videoSourceOf(node);
  if (video) return <Video src={video} />;
  const action = actionOf(node);
  return action ? <ActionWidget action={action} {...context} /> : null;
};

const renderChildren = (nodes: readonly Nodes[], context: Context): ReactNode =>
  nodes.map((node, index) => <Fragment key={index}>{renderNode(node, context)}</Fragment>);

const renderNode = (node: Nodes, context: Context): ReactNode => {
  switch (node.type) {
    case 'root':
      return renderChildren(node.children, context);
    case 'paragraph':
      return <p>{renderChildren(node.children, context)}</p>;
    case 'heading':
      return <h3 className="ds-highlight-content__heading">{renderChildren(node.children, context)}</h3>;
    case 'text':
      return node.value;
    case 'emphasis':
      return <em>{renderChildren(node.children, context)}</em>;
    case 'strong':
      return <strong>{renderChildren(node.children, context)}</strong>;
    case 'delete':
      return <del>{renderChildren(node.children, context)}</del>;
    case 'inlineCode':
      return <code>{node.value}</code>;
    case 'code':
      return (
        <pre>
          <code>{node.value}</code>
        </pre>
      );
    case 'break':
      return <br />;
    case 'thematicBreak':
      return <hr />;
    case 'blockquote':
      return <blockquote>{renderChildren(node.children, context)}</blockquote>;
    case 'list':
      return node.ordered ? (
        <ol start={node.start ?? undefined}>{renderChildren(node.children, context)}</ol>
      ) : (
        <ul>{renderChildren(node.children, context)}</ul>
      );
    case 'listItem':
      return <li>{renderChildren(node.children, context)}</li>;
    case 'link': {
      const href = sanitizeUrl(node.url);
      const children = renderChildren(node.children, context);
      return href ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ) : (
        children
      );
    }
    case 'image': {
      const src = sanitizeUrl(node.url);
      return src ? <img src={src} alt={node.alt ?? ''} loading="lazy" /> : null;
    }
    default:
      return isDirective(node) ? renderDirective(node, context) : null;
  }
};

/**
 * Renders a highlight's Markdown: formatting, lists, links, images, videos and actions. Raw HTML in the
 * text is dropped, URLs are limited to http, https, mailto and relative ones.
 */
const HighlightContentView = ({ markdown, highlight, highlights }: HighlightContentViewProps) => {
  const root = useMemo(() => parseContent(markdown), [markdown]);
  return <div className="ds-highlight-content">{renderNode(root, { highlight, highlights })}</div>;
};

export default HighlightContentView;
