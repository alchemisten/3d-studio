import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { toInstance, useViewerState } from '@schablone/3d-studio-core';
import {
  addContentAction,
  type ContentAction,
  contentActions,
  type ContentActionType,
  type Highlight,
  highlightLabel,
  moveContentAction,
  removeContentAction,
  replaceContentAction,
} from '@schablone/3d-studio-feature-highlights';
import { Button, IconButton, Select } from '@schablone/3d-studio-ui';
import { useEditor } from '../editor-context';
import { Hint, Row, Stack, TextInput } from '../fields';
import { localizedValue } from './highlight-draft';
import type { HighlightEditorApi } from './use-highlight-editor';

export interface HighlightActionsProps {
  editor: HighlightEditorApi;
  highlight: Highlight;
  /** Locale whose text the actions belong to. */
  locale: string;
}

interface Option {
  value: string;
  label: string;
}

const subjectOf = (action: ContentAction): string => {
  switch (action.type) {
    case 'highlight':
      return action.target;
    case 'link':
      return action.href;
    case 'variant':
      return action.name;
    case 'animation':
      return action.clip;
    case 'tool':
      return action.id;
  }
};

const withSubject = (type: ContentActionType, label: string, subject: string): ContentAction => {
  switch (type) {
    case 'highlight':
      return { type, label, target: subject };
    case 'link':
      return { type, label, href: subject };
    case 'variant':
      return { type, label, name: subject };
    case 'animation':
      return { type, label, clip: subject };
    case 'tool':
      return { type, label, id: subject };
  }
};

const withCurrent = (options: Option[], current: string): Option[] =>
  options.some((option) => option.value === current) ? options : [{ value: current, label: current }, ...options];

/**
 * The actions in a highlight's text as a list: add, edit, remove and reorder them without writing
 * directives. The list and the text are two views of the same Markdown.
 */
export const HighlightActions = ({ editor, highlight, locale }: HighlightActionsProps) => {
  const { t, features, flush } = useEditor();
  const gltf = useViewerState((state) => state.gltf);
  const variants = useViewerState(
    (state) => (state.featureState['material-variant'] as { names?: string[] } | undefined)?.names,
  );
  const { locales, items } = editor;
  const markdown = localizedValue(highlight.description, locale, locales);
  const actions = contentActions(markdown);

  const subjects: Record<ContentActionType, Option[] | undefined> = {
    highlight: [
      { value: 'next', label: t('highlights.actions.target.next') },
      { value: 'previous', label: t('highlights.actions.target.previous') },
      ...items
        .filter((item) => item.id !== highlight.id)
        .map((item) => ({ value: item.id, label: highlightLabel(item, locales[0]) })),
    ],
    link: undefined,
    variant: (variants ?? []).map((name) => ({ value: name, label: name })),
    animation: (gltf?.animations ?? []).map((clip) => ({ value: clip.name, label: clip.name })),
    tool: features
      .map((input) => toInstance(input).feature)
      .filter((feature) => feature.tools)
      .map((feature) => ({ value: feature.id, label: feature.id })),
  };
  const types = (Object.keys(subjects) as ContentActionType[]).filter(
    (type) => type === 'link' || (subjects[type]?.length ?? 0) > 0,
  );
  const defaultOf = (type: ContentActionType) => (type === 'link' ? 'https://' : (subjects[type]?.[0]?.value ?? ''));

  const write = (next: string, transient = false) =>
    editor.setText(highlight.id, 'description', locale, next, { transient });
  const replace = (index: number, action: ContentAction, transient = false) =>
    write(replaceContentAction(markdown, index, action), transient);

  return (
    <Stack>
      {actions.length === 0 && <Hint>{t('highlights.actions.none')}</Hint>}
      <ul className="ds-editor-actions" data-testid="ds-highlight-actions">
        {actions.map((action, index) => {
          const options = subjects[action.type];
          const subject = subjectOf(action);
          const name = t(`highlights.actions.type.${action.type}`);
          return (
            <li key={index} className="ds-editor-actions__item">
              <div className="ds-editor-actions__row">
                <Select
                  label={t('highlights.actions.type')}
                  value={action.type}
                  options={withCurrent(
                    types.map((type) => ({ value: type, label: t(`highlights.actions.type.${type}`) })),
                    action.type,
                  )}
                  onValueChange={(type) =>
                    replace(
                      index,
                      withSubject(type as ContentActionType, action.label, defaultOf(type as ContentActionType)),
                    )
                  }
                />
                <IconButton
                  label={t('highlights.actions.moveUp', { name })}
                  icon={<ArrowUp size={14} aria-hidden="true" />}
                  tooltip={false}
                  disabled={index === 0}
                  onClick={() => write(moveContentAction(markdown, index, -1))}
                />
                <IconButton
                  label={t('highlights.actions.moveDown', { name })}
                  icon={<ArrowDown size={14} aria-hidden="true" />}
                  tooltip={false}
                  disabled={index === actions.length - 1}
                  onClick={() => write(moveContentAction(markdown, index, 1))}
                />
                <IconButton
                  label={t('highlights.actions.remove', { name })}
                  icon={<Trash2 size={14} aria-hidden="true" />}
                  tooltip={false}
                  onClick={() => write(removeContentAction(markdown, index))}
                />
              </div>
              {action.type !== 'tool' && (
                <TextInput
                  value={action.label}
                  label={t('highlights.actions.label')}
                  placeholder={t('highlights.actions.label')}
                  testId={`ds-highlight-action-label-${index}`}
                  onValueChange={(label) => replace(index, { ...action, label }, true)}
                  onCommit={flush}
                />
              )}
              {options ? (
                <Select
                  label={t(`highlights.actions.subject.${action.type}`)}
                  value={subject}
                  options={withCurrent(options, subject)}
                  onValueChange={(next) => replace(index, withSubject(action.type, action.label, next))}
                />
              ) : (
                <TextInput
                  value={subject}
                  label={t('highlights.actions.subject.link')}
                  placeholder="https://"
                  onValueChange={(href) => href && replace(index, withSubject('link', action.label, href), true)}
                  onCommit={flush}
                />
              )}
            </li>
          );
        })}
      </ul>
      <Row>
        <Button
          icon={<Plus size={16} aria-hidden="true" />}
          data-testid="ds-highlight-action-add"
          onClick={() =>
            write(
              addContentAction(markdown, {
                type: 'highlight',
                label: t('highlights.actions.target.next'),
                target: 'next',
              }),
            )
          }
        >
          {t('highlights.actions.add')}
        </Button>
      </Row>
    </Stack>
  );
};
