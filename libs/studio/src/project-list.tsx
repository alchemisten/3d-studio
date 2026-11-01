import type { ReactNode } from 'react';
import type { Project, ProjectAdapter } from '@schablone/3d-studio-core';
import { Slot, SlotProvider, ThemeProvider, type SlotFillsInput, type Theme } from '@schablone/3d-studio-ui';
import { useProjects } from './adapter-context';
import './studio.css';

declare module '@schablone/3d-studio-ui' {
  interface SlotMap {
    'project-list.header': Record<string, never>;
    /** Whole card content. Replace to bring your own card. */
    'project-list.card': { project: Project };
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
  theme?: Theme;
  slots?: SlotFillsInput;
  className?: string;
}

const Card = ({ project, onSelect, getHref }: Pick<ProjectListProps, 'onSelect' | 'getHref'> & { project: Project }) => {
  const content = (
    <Slot name="project-list.card" props={{ project }}>
      {project.thumbnail && <img className="ds-project-card__thumbnail" src={project.thumbnail} alt="" loading="lazy" />}
      <div className="ds-project-card__body">
        <h3 className="ds-project-card__title">{project.name}</h3>
        {project.description && <p className="ds-project-card__description">{project.description}</p>}
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

export const ProjectList = ({ adapter, onSelect, getHref, theme, slots, className }: ProjectListProps) => {
  const { data, loading, error } = useProjects(adapter);
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
        <Slot name="project-list.loading">Loading projects…</Slot>
      </div>
    );
  } else if (!data?.length) {
    body = (
      <div className="ds-project-list__message" data-testid="ds-project-list-empty">
        <Slot name="project-list.empty">No projects yet.</Slot>
      </div>
    );
  } else {
    body = (
      <ul className="ds-project-list__grid" data-testid="ds-project-list-grid">
        {data.map((project) => (
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
            <Slot name="project-list.header" />
          </header>
          {body}
        </div>
      </SlotProvider>
    </ThemeProvider>
  );
};
