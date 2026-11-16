import { describe, expect, it } from 'vitest';
import {
  actionOf,
  addContentAction,
  contentActions,
  type DirectiveNode,
  moveContentAction,
  parseContent,
  removeContentAction,
  replaceContentAction,
  sanitizeUrl,
  serializeContent,
  videoEmbedOf,
  videoSourceOf,
} from './highlight-content';

const text = [
  'A **strong** start.',
  '',
  '::video{src="https://youtu.be/abcdefghijk"}',
  '',
  '::action[Next]{type="highlight" target="next"}',
  '',
  '::action[Shop]{type="link" href="https://example.com"}',
].join('\n');

describe('highlight content', () => {
  it('round-trips Markdown with directives', () => {
    expect(serializeContent(parseContent(text))).toBe(text);
    expect(serializeContent(parseContent('Plain text'))).toBe('Plain text');
  });

  it('reads actions and the video from directives', () => {
    expect(contentActions(text)).toEqual([
      { type: 'highlight', label: 'Next', target: 'next' },
      { type: 'link', label: 'Shop', href: 'https://example.com' },
    ]);
    const video = parseContent(text).children[1] as DirectiveNode;
    expect(videoSourceOf(video)).toBe('https://youtu.be/abcdefghijk');
    expect(actionOf(video)).toBeUndefined();
  });

  it('ignores unknown and incomplete actions', () => {
    expect(contentActions('::action[Fly]{type="teleport" to="x"}\n\n::action[Broken]{type="link"}')).toEqual([]);
  });

  it('adds, replaces, moves and removes actions without touching the text', () => {
    const added = addContentAction('Intro', { type: 'variant', label: 'Midnight', name: 'midnight' });
    expect(added).toBe('Intro\n\n::action[Midnight]{type="variant" name="midnight"}');
    expect(addContentAction('', { type: 'tool', label: '', id: 'body-tint' })).toBe(
      '::action{id="body-tint" type="tool"}',
    );

    const replaced = replaceContentAction(text, 1, { type: 'animation', label: 'Open', clip: 'Door' });
    expect(contentActions(replaced)[1]).toEqual({ type: 'animation', label: 'Open', clip: 'Door' });
    expect(replaced.startsWith('A **strong** start.')).toBe(true);

    expect(contentActions(moveContentAction(text, 0, 1)).map((action) => action.label)).toEqual(['Shop', 'Next']);
    expect(moveContentAction(text, 1, 1)).toBe(text);
    expect(contentActions(removeContentAction(text, 0)).map((action) => action.label)).toEqual(['Shop']);
  });

  it('allows only http, https, mailto and relative URLs', () => {
    expect(sanitizeUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(sanitizeUrl('mailto:info@example.com')).toBe('mailto:info@example.com');
    expect(sanitizeUrl('./images/a.png')).toBe('./images/a.png');
    expect(sanitizeUrl('/a?b=1#c')).toBe('/a?b=1#c');
    expect(sanitizeUrl(' javascript:alert(1)')).toBeUndefined();
    expect(sanitizeUrl('data:text/html,x')).toBeUndefined();
    expect(sanitizeUrl('//evil.example')).toBeUndefined();
    expect(sanitizeUrl('')).toBeUndefined();
  });

  it('embeds YouTube and Vimeo without tracking and other URLs as files', () => {
    expect(videoEmbedOf('https://www.youtube.com/watch?v=abcdefghijk')).toEqual({
      kind: 'frame',
      src: 'https://www.youtube-nocookie.com/embed/abcdefghijk',
    });
    expect(videoEmbedOf('https://vimeo.com/123456')).toEqual({
      kind: 'frame',
      src: 'https://player.vimeo.com/video/123456?dnt=1',
    });
    expect(videoEmbedOf('/media/tour.mp4')).toEqual({ kind: 'file', src: '/media/tour.mp4' });
    expect(videoEmbedOf('javascript:alert(1)')).toBeUndefined();
  });

  it('keeps raw HTML out of the tree as plain html nodes the renderer skips', () => {
    const types = parseContent('<script>alert(1)</script>\n\nText').children.map((node) => node.type);
    expect(types).toEqual(['html', 'paragraph']);
  });
});
