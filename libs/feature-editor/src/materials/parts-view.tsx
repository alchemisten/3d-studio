import { type CSSProperties, type KeyboardEvent, type MouseEvent, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Pipette } from 'lucide-react';
import { Button } from '@schablone/3d-studio-ui';
import { useEditor } from '../editor-context';
import { Hint, TextInput } from '../fields';
import type { LibraryMaterial } from './material-library';
import { treeKeyIntent, type TreeRow } from './object-tree';
import type { MaterialAssignmentApi } from './use-material-assignment';
import { useMaterialDrag } from './use-material-drag';

const swatchStyle = (material: LibraryMaterial | undefined, sourceColor: string | undefined): CSSProperties =>
  ({
    '--ds-swatch-color': material?.material.baseColor ?? sourceColor,
    ...(material?.imageUrl ? { backgroundImage: `url("${material.imageUrl}")` } : {}),
  }) as CSSProperties;

/** The object tree as the main content of the material tab: filter, used materials and one row per part. */
export const PartsView = ({ assignment }: { assignment: MaterialAssignmentApi }) => {
  const { t } = useEditor();
  const list = useRef<HTMLUListElement>(null);
  const drag = useMaterialDrag(assignment);
  const { rows, states, parts, libraryById, selectedKeys, hoverKey, used, tree } = assignment;
  const lastSelected = selectedKeys.at(-1);
  const tabStop = lastSelected ?? rows[0]?.node.key;

  useEffect(() => {
    if (!lastSelected) return;
    Array.from(list.current?.querySelectorAll<HTMLElement>('[data-key]') ?? [])
      .find((row) => row.dataset.key === lastSelected)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [lastSelected]);

  const focusRow = (key: string) =>
    Array.from(list.current?.querySelectorAll<HTMLElement>('[data-key]') ?? [])
      .find((row) => row.dataset.key === key)
      ?.focus();

  const onKeyDown = (event: KeyboardEvent, key: string) => {
    const intent = treeKeyIntent(rows, key, event.key);
    if (!intent) return;
    event.preventDefault();
    if (intent.type === 'focus') focusRow(intent.key);
    else if (intent.type === 'toggle') assignment.setExpanded(intent.key, intent.expanded);
    else assignment.select(intent.key, event.ctrlKey || event.metaKey || event.shiftKey);
  };

  const onClick = (event: MouseEvent, row: TreeRow) => {
    const { key } = row.node;
    const target = event.target as Element;
    if (target.closest('.ds-editor-tree__same')) {
      assignment.selectSameColor(key);
    } else if (row.expanded !== undefined && target.closest('.ds-editor-tree__toggle')) {
      assignment.setExpanded(key, !row.expanded);
    } else {
      assignment.select(key, event.ctrlKey || event.metaKey || event.shiftKey);
    }
  };

  if (!tree) return <Hint>{t('materials.empty')}</Hint>;

  return (
    <div className="ds-editor-parts">
      <TextInput
        type="search"
        value={assignment.filter}
        label={t('materials.filter')}
        placeholder={t('materials.filter')}
        testId="ds-editor-parts-filter"
        onValueChange={assignment.setFilter}
      />
      {used.length > 0 && (
        <ul className="ds-editor-used" aria-label={t('materials.used')}>
          {used.map(({ id, keys }) => {
            const material = libraryById.get(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  className="ds-editor-used__item"
                  data-testid={`ds-editor-used-${id}`}
                  onClick={() => assignment.selectMany(keys)}
                  {...(material
                    ? drag.handlersFor({
                        id,
                        name: material.name,
                        color: material.material.baseColor,
                        imageUrl: material.imageUrl,
                      })
                    : {})}
                >
                  <span className="ds-editor-chip-swatch" style={swatchStyle(material, undefined)} aria-hidden="true" />
                  {material?.name ?? id}
                  <span className="ds-editor-used__count">{keys.length}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <ul
        ref={list}
        role="tree"
        aria-label={t('materials.tree')}
        aria-multiselectable="true"
        className="ds-editor-tree"
        data-testid="ds-editor-tree"
        onPointerLeave={() => assignment.hover(undefined)}
      >
        {rows.map((row) => {
          const { key } = row.node;
          const part = parts.get(key);
          const state = states.get(key);
          const material = libraryById.get(state?.own ?? state?.inherited ?? '');
          const selected = selectedKeys.includes(key);
          const marker = state?.mixed
            ? t('materials.mixed')
            : state?.own === undefined && state?.inherited !== undefined
              ? t('materials.inherited')
              : undefined;
          return (
            <li
              key={key}
              role="treeitem"
              className="ds-editor-tree__row"
              data-key={key}
              data-selected={selected ? '' : undefined}
              data-hover={key === hoverKey ? '' : undefined}
              aria-level={row.level}
              aria-setsize={row.setSize}
              aria-posinset={row.posInSet}
              aria-expanded={row.expanded}
              aria-selected={selected}
              tabIndex={key === tabStop ? 0 : -1}
              style={{ '--ds-editor-tree-level': row.level } as CSSProperties}
              onClick={(event) => onClick(event, row)}
              onKeyDown={(event) => onKeyDown(event, key)}
              onPointerEnter={() => assignment.hover(key)}
            >
              <span className="ds-editor-tree__toggle" aria-hidden="true">
                {row.expanded === undefined ? null : row.expanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </span>
              <span
                className="ds-editor-chip-swatch"
                data-mixed={state?.mixed ? '' : undefined}
                style={swatchStyle(material, part?.sourceColor)}
                aria-hidden="true"
              />
              <span className="ds-editor-tree__label">{part?.name}</span>
              {material && !state?.mixed && <span className="ds-editor-tree__material">{material.name}</span>}
              {marker && <span className="ds-editor-tree__meta">{marker}</span>}
              {part?.sourceColor && (
                <span className="ds-editor-tree__same" title={t('materials.sameColor')}>
                  <Pipette size={14} aria-label={t('materials.sameColor')} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {rows.length === 0 && <Hint>{t('materials.noPart')}</Hint>}
      {drag.ghost}
      {selectedKeys.length > 0 && (
        <div className="ds-editor-parts__footer">
          <span>{t('materials.selected', { count: selectedKeys.length })}</span>
          <Button variant="ghost" onClick={assignment.back}>
            {t('materials.clearSelection')}
          </Button>
          <Button data-testid="ds-editor-choose-material" onClick={assignment.openBrowser}>
            {t('materials.choose')}
          </Button>
        </div>
      )}
    </div>
  );
};
