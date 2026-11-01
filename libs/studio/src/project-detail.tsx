import type { ReactNode } from 'react';
import { Viewer, type FeatureInput, type ProjectAdapter, type ViewerProps } from '@schablone/3d-studio-core';
import { Slot, SlotProvider, ThemeProvider, type SlotFillsInput, type Theme } from '@schablone/3d-studio-ui';
import { useProject } from './adapter-context';
import { defaultFeatures } from './default-features';
import './studio.css';

declare module '@schablone/3d-studio-ui' {
  interface SlotMap {
    'project-detail.loading': Record<string, never>;
    'project-detail.not-found': { id: string };
    'project-detail.error': { error: Error };
  }
}

export interface ProjectDetailProps {
  projectId: string;
  adapter?: ProjectAdapter;
  /** Defaults to every feature (`defaultFeatures`). Pass your own list to add, remove or configure. */
  features?: FeatureInput[];
  theme?: Theme;
  slots?: SlotFillsInput;
  /** Forwarded to `<Viewer>` for anything not covered here (canvas, draco, controls, viewOptions…). */
  viewer?: Omit<ViewerProps, 'source' | 'features' | 'featureConfig' | 'theme' | 'slots' | 'children'>;
  /** Overlay items rendered inside the viewer. */
  children?: ReactNode;
  className?: string;
}

export const ProjectDetail = ({
  projectId,
  adapter,
  features = defaultFeatures,
  theme,
  slots,
  viewer,
  children,
  className,
}: ProjectDetailProps) => {
  const { data: project, loading, error } = useProject(projectId, adapter);
  if (error || !project) {
    return (
      <ThemeProvider theme={theme} className={['ds-project-detail', className].filter(Boolean).join(' ')}>
        <SlotProvider slots={slots}>
          <div className="ds-project-detail__message" data-testid="ds-project-detail-message" role={error ? 'alert' : undefined}>
            {error ? (
              <Slot name="project-detail.error" props={{ error }}>
                {error.message}
              </Slot>
            ) : loading ? (
              <Slot name="project-detail.loading">Loading project…</Slot>
            ) : (
              <Slot name="project-detail.not-found" props={{ id: projectId }}>
                Project not found.
              </Slot>
            )}
          </div>
        </SlotProvider>
      </ThemeProvider>
    );
  }
  return (
    <Viewer
      {...viewer}
      className={['ds-project-detail', className].filter(Boolean).join(' ')}
      source={project.source}
      features={features}
      featureConfig={project.featureConfig}
      theme={theme}
      slots={slots}
    >
      {children}
    </Viewer>
  );
};
