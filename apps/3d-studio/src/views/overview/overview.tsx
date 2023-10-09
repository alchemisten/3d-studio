import { FC, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLogger } from '@schablone/logging-react';

import type { LegacyConfig, LegacyProject } from '../../types';
import { EmbedBuilder, PageHeader, ProjectPreview } from '../../components';
import { useConfigContext } from '../../provider';
import styles from './overview.module.scss';

export const Overview: FC = () => {
  const { logger } = useLogger();
  const { baseUrl, pathAllProjects } = useConfigContext();
  const { data, error, isError, isLoading, isSuccess } = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetch(`${baseUrl}${pathAllProjects}`).then((res) => res.json()),
  });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<LegacyProject>();

  const onSelectProject = (project: LegacyProject) => {
    if (selectedProject?.key !== project.key) {
      setSelectedProject(project);
      setSidebarOpen(true);
    } else {
      setSelectedProject(undefined);
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    if (isError) {
      logger.error('Error loading list of all projects', {
        objects: { baseUrl, pathAllProjects: projectListPath },
        error,
      });
    }
  }, [baseUrl, error, isError, logger, pathAllProjects]);

  return (
    <div className={`${styles.page} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
      <PageHeader alt={data?.name} logo={data?.logo} onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />

      <EmbedBuilder open={sidebarOpen} selectedProject={selectedProject} />

      <main className={styles.pageContent}>
        {isLoading && <div>Loading</div>}

        {isError && (
          <div className={styles.error}>Error while loading projects. Only an administrator can fix this.</div>
        )}

        {isSuccess && (
          <div className={styles.projects}>
            {(data as LegacyConfig)?.projects.map((project) => (
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
        )}
      </main>
    </div>
  );
};
