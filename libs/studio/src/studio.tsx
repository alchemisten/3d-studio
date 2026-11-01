import { useState, type ReactNode } from 'react';
import type { ProjectAdapter } from '@schablone/3d-studio-core';
import { IconButton, Overlay } from '@schablone/3d-studio-ui';
import { ProjectAdapterProvider } from './adapter-context';
import { ProjectDetail, type ProjectDetailProps } from './project-detail';
import { ProjectList, type ProjectListProps } from './project-list';

export interface StudioProps extends Pick<ProjectDetailProps, 'features' | 'theme' | 'slots' | 'viewer'> {
  adapter: ProjectAdapter;
  /** Controlled selection, e.g. from your router. Omit for built-in state. */
  projectId?: string | null;
  onProjectChange?: (id: string | null) => void;
  list?: Pick<ProjectListProps, 'getHref'>;
  /** Overlay items for the detail view. */
  children?: ReactNode;
  className?: string;
}

/** Project list and detail in one component, with built-in or controlled selection. */
export const Studio = ({
  adapter,
  projectId,
  onProjectChange,
  list,
  features,
  theme,
  slots,
  viewer,
  children,
  className,
}: StudioProps) => {
  const [internal, setInternal] = useState<string | null>(null);
  const selected = projectId === undefined ? internal : projectId;
  const select = (id: string | null) => {
    setInternal(id);
    onProjectChange?.(id);
  };
  return (
    <ProjectAdapterProvider adapter={adapter}>
      <div className={['ds-studio', className].filter(Boolean).join(' ')} data-testid="ds-studio">
        {selected ? (
          <ProjectDetail projectId={selected} features={features} theme={theme} slots={slots} viewer={viewer}>
            <Overlay.TopLeft>
              <IconButton label="Back to projects" icon="←" data-testid="ds-studio-back" onClick={() => select(null)} />
            </Overlay.TopLeft>
            {children}
          </ProjectDetail>
        ) : (
          <ProjectList {...list} theme={theme} slots={slots} onSelect={(project) => select(project.id)} />
        )}
      </div>
    </ProjectAdapterProvider>
  );
};
