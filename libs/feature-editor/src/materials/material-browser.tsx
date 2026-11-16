import { type CSSProperties, type KeyboardEvent, type ReactNode, useMemo, useState } from 'react';
import { Ban } from 'lucide-react';
import { useEditor } from '../editor-context';
import { Hint, Stack, SubViewHeader, TextInput } from '../fields';
import type { MaterialAssignmentApi } from './use-material-assignment';
import { useMaterialDrag } from './use-material-drag';

const ALL_GROUPS = '';
const ORIGINAL = null;
const NAMES_SHOWN = 3;

interface Tile {
  /** Library material id, or `null` for the original material. */
  id: string | null;
  name: string;
  meta?: string;
  imageUrl?: string;
  color?: string;
}

/** Index a key moves to in a grid of `count` tiles with `columns` per row; `undefined` for other keys. */
export const gridIndex = (key: string, current: number, count: number, columns: number): number | undefined => {
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[key];
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (step === undefined) return undefined;
  const next = current + step;
  return next < 0 || next >= count ? current : next;
};

const columnsOf = (grid: Element): number => {
  const tiles = Array.from(grid.children) as HTMLElement[];
  const firstRow = tiles[0]?.offsetTop;
  return Math.max(1, tiles.filter((tile) => tile.offsetTop === firstRow).length);
};

export interface MaterialBrowserProps {
  assignment: MaterialAssignmentApi;
  /** Shown with the hint of an empty library. */
  emptyAction?: ReactNode;
}

/** The library as a searchable grid of swatches for the selected parts; hovering previews, a click applies. */
export const MaterialBrowser = ({ assignment, emptyAction }: MaterialBrowserProps) => {
  const { t } = useEditor();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState(ALL_GROUPS);
  const { library, selectedKeys, parts, currentId } = assignment;
  const drag = useMaterialDrag(assignment);

  const groups = useMemo(() => [...new Set(library.flatMap((entry) => entry.group ?? []))], [library]);
  const tiles = useMemo<Tile[]>(() => {
    const needle = query.trim().toLowerCase();
    const shown = library.filter(
      (entry) =>
        (group === ALL_GROUPS || entry.group === group) &&
        (!needle || `${entry.name} ${entry.meta ?? ''}`.toLowerCase().includes(needle)),
    );
    return [
      { id: ORIGINAL, name: t('materials.original') },
      ...shown.map((entry) => ({
        id: entry.id,
        name: entry.name,
        meta: entry.meta,
        imageUrl: entry.imageUrl,
        color: entry.material.baseColor,
      })),
    ];
  }, [library, query, group, t]);

  const names = selectedKeys.map((key) => parts.get(key)?.name ?? key);
  const worn =
    currentId ?? (selectedKeys.every((key) => assignment.states.get(key)?.own === undefined) ? ORIGINAL : undefined);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const grid = event.currentTarget.parentElement;
    if (event.key === 'Escape') {
      event.stopPropagation();
      assignment.preview(undefined);
      return;
    }
    const next = grid && gridIndex(event.key, index, tiles.length, columnsOf(grid));
    if (next === undefined || next === null || !grid) return;
    event.preventDefault();
    (grid.children[next] as HTMLElement | undefined)?.focus();
  };

  return (
    <Stack>
      <SubViewHeader
        back={t('materials.back')}
        onBack={assignment.back}
        title={t('materials.selected', { count: selectedKeys.length })}
      />
      <Hint>
        {names.slice(0, NAMES_SHOWN).join(', ')}
        {names.length > NAMES_SHOWN && ` +${names.length - NAMES_SHOWN}`}
      </Hint>
      {library.length === 0 ? (
        <div className="ds-editor-row">
          <Hint>{t('materials.emptyLibrary')}</Hint>
          {emptyAction}
        </div>
      ) : (
        <>
          <TextInput
            type="search"
            value={query}
            label={t('materials.search')}
            placeholder={t('materials.search')}
            testId="ds-editor-material-search"
            onValueChange={setQuery}
          />
          {groups.length > 0 && (
            <div className="ds-editor-filters" role="group" aria-label={t('materials.groups')}>
              {[ALL_GROUPS, ...groups].map((entry) => (
                <button
                  key={entry}
                  type="button"
                  className="ds-editor-filter"
                  aria-pressed={group === entry}
                  onClick={() => setGroup(entry)}
                >
                  {entry === ALL_GROUPS ? t('materials.allGroups') : entry}
                </button>
              ))}
            </div>
          )}
          <div
            role="radiogroup"
            aria-label={t('materials.library')}
            className="ds-editor-swatches"
            data-testid="ds-editor-swatches"
            onPointerLeave={() => assignment.preview(undefined)}
          >
            {tiles.map((tile, index) => (
              <button
                key={tile.id ?? 'original'}
                type="button"
                role="radio"
                aria-checked={tile.id === worn}
                tabIndex={tile.id === worn || (worn === undefined && index === 0) ? 0 : -1}
                className="ds-editor-swatch"
                data-testid={`ds-editor-swatch-${tile.id ?? 'original'}`}
                onClick={() => assignment.apply(tile.id ?? undefined)}
                onPointerEnter={() => assignment.preview(tile.id)}
                onFocus={() => assignment.preview(tile.id)}
                onBlur={() => assignment.preview(undefined)}
                onKeyDown={(event) => onKeyDown(event, index)}
                {...(tile.id === ORIGINAL ? {} : drag.handlersFor({ ...tile, id: tile.id }))}
              >
                {tile.imageUrl ? (
                  <img
                    className="ds-editor-swatch__image"
                    src={tile.imageUrl}
                    alt=""
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <span
                    className="ds-editor-swatch__image"
                    style={tile.color ? ({ '--ds-swatch-color': tile.color } as CSSProperties) : undefined}
                  >
                    {tile.id === ORIGINAL && <Ban size={20} aria-hidden="true" />}
                  </span>
                )}
                <span className="ds-editor-swatch__name">{tile.name}</span>
                {tile.meta && <span className="ds-editor-swatch__meta">{tile.meta}</span>}
              </button>
            ))}
          </div>
          {tiles.length === 1 && <Hint>{t('materials.noMatch')}</Hint>}
          {drag.ghost}
        </>
      )}
    </Stack>
  );
};
