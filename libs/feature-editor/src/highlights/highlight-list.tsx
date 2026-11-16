import { type KeyboardEvent, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Undo2 } from 'lucide-react';
import { useViewer, useViewerState } from '@schablone/3d-studio-core';
import { highlightLabel } from '@schablone/3d-studio-feature-highlights';
import { Button, IconButton } from '@schablone/3d-studio-ui';
import { useEditor } from '../editor-context';
import { Hint, Stack } from '../fields';
import { nextIndex } from '../shell/shell-model';
import { highlightEditorStateOf, patchHighlightEditorState } from './highlight-editor-state';
import type { HighlightEditorApi } from './use-highlight-editor';

const DRAG_TYPE = 'application/x-ds-editor-highlight';
const UNDO_HINT_MS = 8000;

/** The highlights in the order viewers step through them; a row opens its detail. */
export const HighlightList = ({ editor }: { editor: HighlightEditorApi }) => {
  const viewer = useViewer();
  const { t, undo } = useEditor();
  const { shots, removedTitle } = useViewerState(highlightEditorStateOf);

  useEffect(() => {
    if (removedTitle === undefined) return undefined;
    const timer = window.setTimeout(() => patchHighlightEditorState(viewer, { removedTitle: undefined }), UNDO_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [removedTitle, viewer]);
  const [dropIndex, setDropIndex] = useState<number>();
  const { items, mode } = editor;
  const adding = mode === 'add';

  const onRowKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    const { id } = items[index];
    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      editor.move(id, event.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      editor.select(id);
      return;
    }
    const next =
      event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? undefined : nextIndex(event.key, index, items.length);
    if (next === undefined) return;
    event.preventDefault();
    event.currentTarget.closest('[role="listbox"]')?.querySelectorAll<HTMLElement>('[role="option"]')[next]?.focus();
  };

  return (
    <Stack>
      {removedTitle !== undefined && (
        <div className="ds-editor-toast" role="status" data-testid="ds-highlight-removed">
          <span>{t('highlights.removed', { name: removedTitle })}</span>
          <Button
            variant="ghost"
            icon={<Undo2 size={16} aria-hidden="true" />}
            onClick={() => {
              undo();
              patchHighlightEditorState(viewer, { removedTitle: undefined });
            }}
          >
            {t('shell.undo')}
          </Button>
        </div>
      )}
      {items.length === 0 ? (
        <Hint status>{t('highlights.empty')}</Hint>
      ) : (
        <ul
          role="listbox"
          aria-label={t('highlights.list')}
          className="ds-editor-items"
          data-testid="ds-highlight-list"
        >
          {items.map((highlight, index) => {
            const title = highlightLabel(highlight, editor.locales[0]);
            return (
              <li
                key={highlight.id}
                role="presentation"
                className="ds-editor-item"
                data-drop={dropIndex === index ? '' : undefined}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(DRAG_TYPE, highlight.id);
                  event.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(event) => {
                  if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
                  event.preventDefault();
                  setDropIndex(index);
                }}
                onDragLeave={() => setDropIndex(undefined)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDropIndex(undefined);
                  editor.reorder(event.dataTransfer.getData(DRAG_TYPE), index);
                }}
              >
                <div
                  role="option"
                  aria-selected={false}
                  tabIndex={index === 0 ? 0 : -1}
                  className="ds-editor-item__main"
                  data-testid={`ds-highlight-row-${highlight.id}`}
                  onClick={() => editor.select(highlight.id)}
                  onKeyDown={(event) => onRowKeyDown(event, index)}
                >
                  <span className="ds-editor-item__number">{index + 1}</span>
                  {shots[highlight.id] ? (
                    <img className="ds-editor-item__thumbnail" src={shots[highlight.id]} alt="" />
                  ) : (
                    <span className="ds-editor-item__thumbnail" />
                  )}
                  <span className="ds-editor-item__title">{title}</span>
                  <span
                    className="ds-editor-dot"
                    style={
                      highlight.color ? ({ '--ds-swatch-color': highlight.color } as React.CSSProperties) : undefined
                    }
                    aria-hidden="true"
                  />
                </div>
                <span className="ds-editor-item__actions">
                  <IconButton
                    label={t('highlights.moveUp', { name: title })}
                    icon={<ArrowUp size={14} aria-hidden="true" />}
                    tooltip={false}
                    disabled={index === 0}
                    onClick={() => editor.move(highlight.id, -1)}
                  />
                  <IconButton
                    label={t('highlights.moveDown', { name: title })}
                    icon={<ArrowDown size={14} aria-hidden="true" />}
                    tooltip={false}
                    disabled={index === items.length - 1}
                    onClick={() => editor.move(highlight.id, 1)}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div>
        <Button
          active={adding}
          icon={<Plus size={16} aria-hidden="true" />}
          data-testid="ds-highlight-add"
          onClick={() => editor.setMode(adding && items.length > 0 ? undefined : 'add')}
        >
          {t('highlights.add')}
        </Button>
      </div>
      {adding && items.length > 0 && <Hint status>{t('highlights.placeHint')}</Hint>}
    </Stack>
  );
};
