import { FC, useEffect, useState } from 'react';
import { useLogger } from '@schablone/logging-react';

import type { LegacyConfig, LegacyProject } from '../../types';
import { EmbedBuilder, PageHeader, ProjectPreview } from '../../components';
import { useConfigContext } from '../../provider';
import styles from './overview.module.scss';

export const Overview: FC = () => {
  const { baseUrl } = useConfigContext();
  const { logger } = useLogger();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<LegacyProject>();
  const [config, setConfig] = useState<LegacyConfig>();

  const onSelectProject = (project: LegacyProject) => {
    if (selectedProject?.key !== project.key) {
      setSelectedProject(project);
      setSidebarOpen(true);
    } else {
      setSelectedProject(undefined);
      setSidebarOpen(false);
    }
  };

  useEffect(
    () => {
      if (!isLoading) {
        setIsLoading(true);
        fetch(`${baseUrl}/api/customer/projects/`)
          .then(
            (response) => response.json(),
            (error) => {
              logger.error('Error while loading projects. Check if the baseURL and projects path are correct.', {
                error,
              });
            }
          )
          .then((data) => setConfig(data))
          .finally(() => setIsLoading(false));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className={`${styles.page} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
      <PageHeader alt={config?.name} logo={config?.logo} onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />

      <EmbedBuilder open={sidebarOpen} selectedProject={selectedProject} />

      <main className={styles.pageContent}>
        <div className={styles.projects}>
          {config?.projects.map((project) => (
            <ProjectPreview
              image={project.image}
              key={project.key}
              onSelect={() => onSelectProject(project)}
              selected={selectedProject?.key === project.key}
              slug={project.key}
              title={project.name}
            />
          ))}
        </div>
      </main>
    </div>
  );
};
