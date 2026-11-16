import { describe, expect, it } from 'vitest';
import { docToMarkdown, markdownToDoc } from './rich-text-model';

const text = [
  'A **bold** and _italic_ [link](https://example.com) with ![alt](https://example.com/a.png).',
  '',
  '### Heading',
  '',
  '- one',
  '- two',
  '',
  '1. first',
  '2. second',
  '',
  '::video{src="https://vimeo.com/123456"}',
  '',
  '::action[Shop]{type="link" href="https://example.com"}',
].join('\n');

describe('rich text model', () => {
  it('round-trips formatting, lists, links, images, videos and actions', () => {
    expect(docToMarkdown(markdownToDoc(text))).toBe(text);
  });

  it('maps Markdown onto the editor document', () => {
    const doc = markdownToDoc('**Hi** there\n\n::action[Next]{type="highlight" target="next"}');
    expect(doc.content).toEqual([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hi', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' there' },
        ],
      },
      { type: 'actionChip', attrs: { action: { type: 'highlight', label: 'Next', target: 'next' } } },
    ]);
  });

  it('writes an empty document as an empty string and reads it back as one empty paragraph', () => {
    expect(markdownToDoc('')).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
    expect(docToMarkdown({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe('');
  });

  it('merges adjacent text of one link and nests bold and italic', () => {
    const markdown = docToMarkdown({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'to ', marks: [{ type: 'link', attrs: { href: '/a' } }] },
            {
              type: 'text',
              text: 'here',
              marks: [{ type: 'link', attrs: { href: '/a' } }, { type: 'bold' }, { type: 'italic' }],
            },
          ],
        },
      ],
    });
    expect(markdown).toBe('[to **_here_**](/a)');
  });

  it('keeps what the editor cannot edit as raw blocks', () => {
    const source = '> a quote\n\n::chart{id="sales"}';
    const doc = markdownToDoc(source);
    expect(doc.content?.map((node) => node.type)).toEqual(['rawBlock', 'rawBlock']);
    expect(docToMarkdown(doc)).toBe(source);
  });
});
