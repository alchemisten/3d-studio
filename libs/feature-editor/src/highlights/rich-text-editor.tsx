import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Bold, Film, Image as ImageIcon, Italic, Link2, List, ListOrdered } from 'lucide-react';
import Image from '@tiptap/extension-image';
import { EditorContent, Node, useEditor as useRichText } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { type ContentAction, sanitizeUrl } from '@schablone/3d-studio-feature-highlights';
import { Button, IconButton, Toolbar } from '@schablone/3d-studio-ui';
import { useEditor } from '../editor-context';
import { TextInput } from '../fields';
import { type DocNode, docToMarkdown, markdownToDoc } from './rich-text-model';

const VideoBlock = Node.create({
  name: 'videoBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes: () => ({ src: { default: '' } }),
  parseHTML: () => [{ tag: 'div[data-video]' }],
  renderHTML: ({ node }) => ['div', { 'data-video': '', class: 'ds-editor-rich__video' }, String(node.attrs.src)],
});

const ActionChip = Node.create({
  name: 'actionChip',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes: () => ({ action: { default: null } }),
  parseHTML: () => [{ tag: 'div[data-action]' }],
  renderHTML: ({ node }) => {
    const action = node.attrs.action as ContentAction | null;
    return [
      'div',
      { 'data-action': action?.type ?? '', class: 'ds-editor-rich__action' },
      action?.label || action?.type || '',
    ];
  },
});

const RawBlock = Node.create({
  name: 'rawBlock',
  group: 'block',
  atom: true,
  addAttributes: () => ({ markdown: { default: '' } }),
  parseHTML: () => [{ tag: 'pre[data-raw]' }],
  renderHTML: ({ node }) => ['pre', { 'data-raw': '', class: 'ds-editor-rich__raw' }, String(node.attrs.markdown)],
});

const extensions = [
  StarterKit.configure({
    heading: { levels: [3] },
    link: { openOnClick: false, autolink: false },
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    underline: false,
  }),
  Image.configure({ inline: true }),
  VideoBlock,
  ActionChip,
  RawBlock,
];

type Prompt = 'link' | 'image' | 'video';

export interface RichTextEditorProps {
  /** The text as Markdown. */
  value: string;
  /** Called with the Markdown on every edit. */
  onValueChange: (markdown: string) => void;
  /** Called when the editor loses focus: the edit is finished. */
  onCommit: () => void;
  /** Accessible name of the text box. */
  label: string;
  testId?: string;
}

interface ToolButton {
  label: string;
  icon: ReactNode;
  active?: boolean;
  run: () => void;
}

/**
 * WYSIWYG editor for a highlight's text. It reads and writes Markdown, including videos and actions as
 * blocks of their own; its own undo history covers one focus session.
 */
export const RichTextEditor = ({ value, onValueChange, onCommit, label, testId }: RichTextEditorProps) => {
  const { t } = useEditor();
  const [prompt, setPrompt] = useState<Prompt>();
  const [url, setUrl] = useState('');
  const written = useRef(value);
  const handlers = useRef({ onValueChange, onCommit });
  handlers.current = { onValueChange, onCommit };

  const editor = useRichText({
    extensions,
    content: markdownToDoc(value),
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: 'ds-editor-rich__content',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        ...(testId ? { 'data-testid': testId } : {}),
      },
    },
    onUpdate: ({ editor: current }) => {
      written.current = docToMarkdown(current.getJSON() as DocNode);
      handlers.current.onValueChange(written.current);
    },
    onBlur: () => handlers.current.onCommit(),
  });

  useEffect(() => {
    if (!editor || value === written.current) return;
    written.current = value;
    editor.commands.setContent(markdownToDoc(value), { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return null;

  const open = (kind: Prompt) => {
    setUrl(kind === 'link' ? String(editor.getAttributes('link').href ?? '') : '');
    setPrompt(kind);
  };

  const apply = () => {
    const safe = sanitizeUrl(url);
    const chain = editor.chain().focus();
    if (prompt === 'link') {
      if (safe) chain.extendMarkRange('link').setLink({ href: safe }).run();
      else chain.extendMarkRange('link').unsetLink().run();
    } else if (safe && prompt === 'image') {
      chain.setImage({ src: safe }).run();
    } else if (safe && prompt === 'video') {
      chain.insertContent({ type: 'videoBlock', attrs: { src: safe } }).run();
    }
    setPrompt(undefined);
  };

  const tools: ToolButton[] = [
    {
      label: 'highlights.rich.bold',
      icon: <Bold size={16} aria-hidden="true" />,
      active: editor.isActive('bold'),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'highlights.rich.italic',
      icon: <Italic size={16} aria-hidden="true" />,
      active: editor.isActive('italic'),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'highlights.rich.bulletList',
      icon: <List size={16} aria-hidden="true" />,
      active: editor.isActive('bulletList'),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'highlights.rich.orderedList',
      icon: <ListOrdered size={16} aria-hidden="true" />,
      active: editor.isActive('orderedList'),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: 'highlights.rich.link',
      icon: <Link2 size={16} aria-hidden="true" />,
      active: editor.isActive('link') || prompt === 'link',
      run: () => open('link'),
    },
    {
      label: 'highlights.rich.image',
      icon: <ImageIcon size={16} aria-hidden="true" />,
      active: prompt === 'image',
      run: () => open('image'),
    },
    {
      label: 'highlights.rich.video',
      icon: <Film size={16} aria-hidden="true" />,
      active: prompt === 'video',
      run: () => open('video'),
    },
  ];

  return (
    <div className="ds-editor-rich">
      <Toolbar label={t('highlights.rich.toolbar')} className="ds-editor-rich__toolbar">
        {tools.map((tool) => (
          <IconButton
            key={tool.label}
            label={t(tool.label)}
            icon={tool.icon}
            active={tool.active}
            tooltip={false}
            title={t(tool.label)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={tool.run}
          />
        ))}
      </Toolbar>
      {prompt && (
        <form
          className="ds-editor-rich__prompt"
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
        >
          <TextInput
            value={url}
            label={t(`highlights.rich.${prompt}.url`)}
            placeholder={t(`highlights.rich.${prompt}.url`)}
            focused
            testId="ds-editor-rich-url"
            onValueChange={setUrl}
          />
          <Button type="submit">{t('highlights.rich.apply')}</Button>
          <Button variant="ghost" onClick={() => setPrompt(undefined)}>
            {t('shell.cancel')}
          </Button>
        </form>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};
