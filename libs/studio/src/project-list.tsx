import { useMemo, useState, type ReactNode } from 'react';
import { ChevronRight, Box, Search } from 'lucide-react';
import type { Project, ProjectAdapter } from '@schablone/3d-studio-core';
import { Slot, SlotProvider, ThemeProvider, type SlotFillsInput, type Theme } from '@schablone/3d-studio-ui';
import { useProjects } from './adapter-context';
import './studio.css';

declare module '@schablone/3d-studio-ui' {
  interface SlotMap {
    'project-list.header': Record<string, never>;
    /** Right side of the toolbar, next to the search field (filters, sort, view toggles). */
    'project-list.toolbar': Record<string, never>;
    /** Whole card content. Replace to bring your own card. */
    'project-list.card': { project: Project };
    /** The thumbnail area. Replace for custom previews, e.g. a live 3D preview. */
    'project-list.card.media': { project: Project };
    /** Overlay on the thumbnail: status badges, favorite buttons, … */
    'project-list.card.media.overlay': { project: Project };
    /** Below the description, e.g. tags or custom meta. Defaults to the project's tags. */
    'project-list.card.meta': { project: Project };
    /** Card footer, outside the clickable area, so it can hold buttons. */
    'project-list.card.footer': { project: Project };
    'project-list.empty': Record<string, never>;
    'project-list.loading': Record<string, never>;
    'project-list.error': { error: Error };
  }
}

export interface ProjectListProps {
  /** Falls back to the adapter from `<Studio>` / `<ProjectAdapterProvider>`. */
  adapter?: ProjectAdapter;
  /** Called on card click. Use it with your router or with `<Studio>`. */
  onSelect?: (project: Project) => void;
  /** Renders cards as links, e.g. `(p) => `/projects/${p.id}``. Takes precedence over `onSelect` for plain clicks. */
  getHref?: (project: Project) => string;
  /** Show the search field. Defaults to true when the list has more than 4 projects. */
  search?: boolean;
  theme?: Theme;
  slots?: SlotFillsInput;
  className?: string;
}

const matches = (project: Project, query: string) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [project.name, project.description, ...(project.tags ?? [])].some((value) => value?.toLowerCase().includes(needle));
};

const Card = ({ project, onSelect, getHref }: Pick<ProjectListProps, 'onSelect' | 'getHref'> & { project: Project }) => {
  const content = (
    <Slot name="project-list.card" props={{ project }}>
      <div className="ds-project-card__media">
        <Slot name="project-list.card.media" props={{ project }}>
          {project.thumbnail ? (
            <img className="ds-project-card__thumbnail" src={project.thumbnail} alt="" loading="lazy" />
          ) : (
            <span className="ds-project-card__placeholder" aria-hidden="true">
              <Box size={32} strokeWidth={1.5} />
            </span>
          )}
        </Slot>
        <div className="ds-project-card__overlay">
          <Slot name="project-list.card.media.overlay" props={{ project }} />
        </div>
      </div>
      <div className="ds-project-card__body">
        <h3 className="ds-project-card__title">{project.name}<ChevronRight className="ds-project-card__arrow" size={20} aria-hidden="true" /></h3>
        {project.description && <p className="ds-project-card__description">{project.description}</p>}
        <div className="ds-project-card__meta">
          <Slot name="project-list.card.meta" props={{ project }}>
            {project.tags?.map((tag) => <span key={tag} className="ds-project-card__tag">{tag}</span>)}
          </Slot>
        </div>
      </div>
    </Slot>
  );
  const href = getHref?.(project);
  const footer = (
    <div className="ds-project-card__footer">
      <Slot name="project-list.card.footer" props={{ project }} />
    </div>
  );
  return (
    <li className="ds-project-card" data-testid={`ds-project-card-${project.id}`}>
      {href ? (
        <a className="ds-project-card__main" href={href} onClick={() => onSelect?.(project)}>
          {content}
        </a>
      ) : (
        <button type="button" className="ds-project-card__main" onClick={() => onSelect?.(project)}>
          {content}
        </button>
      )}
      {footer}
    </li>
  );
};

export const ProjectList = ({ adapter, onSelect, getHref, search, theme, slots, className }: ProjectListProps) => {
  const { data, loading, error } = useProjects(adapter);
  const [query, setQuery] = useState('');
  const visible = useMemo(() => data?.filter((project) => matches(project, query)), [data, query]);
  const showSearch = search ?? (data?.length ?? 0) > 4;
  let body: ReactNode;
  if (error) {
    body = (
      <div className="ds-project-list__message" role="alert" data-testid="ds-project-list-error">
        <Slot name="project-list.error" props={{ error }}>
          {error.message}
        </Slot>
      </div>
    );
  } else if (loading && !data) {
    body = (
      <div className="ds-project-list__message" data-testid="ds-project-list-loading">
        <Slot name="project-list.loading">Loading scenes…</Slot>
      </div>
    );
  } else if (!data?.length) {
    body = (
      <div className="ds-project-list__message" data-testid="ds-project-list-empty">
        <Slot name="project-list.empty">No scenes yet.</Slot>
      </div>
    );
  } else if (!visible?.length) {
    body = (
      <div className="ds-project-list__message" data-testid="ds-project-list-no-results">
        No scenes match “{query}”.
      </div>
    );
  } else {
    body = (
      <ul className="ds-project-list__grid" data-testid="ds-project-list-grid">
        {visible.map((project) => (
          <Card key={project.id} project={project} onSelect={onSelect} getHref={getHref} />
        ))}
      </ul>
    );
  }
  return (
    <ThemeProvider theme={theme} className={['ds-project-list', className].filter(Boolean).join(' ')}>
      <SlotProvider slots={slots}>
        <div data-testid="ds-project-list" className="ds-project-list__inner">
          <header className="ds-project-list__header">
            <Slot name="project-list.header"><h1>Scenes</h1></Slot>
          </header>
          {(showSearch || slots?.['project-list.toolbar']) && (
            <div className="ds-project-list__toolbar">
              {showSearch && (
                <label className="ds-project-list__search">
                  <Search size={16} aria-hidden="true" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search scenes"
                    aria-label="Search scenes"
                    data-testid="ds-project-list-search"
                  />
                </label>
              )}
              <Slot name="project-list.toolbar" />
            </div>
          )}
          {body}
        </div>
      </SlotProvider>
    </ThemeProvider>
  );
};
