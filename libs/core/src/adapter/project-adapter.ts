/** A viewable project, as returned by a `ProjectAdapter`. */
export interface Project {
  id: string;
  name: string;
  description?: string;
  /** Short labels shown as badges on list cards and used by the list search. */
  tags?: string[];
  /** Preview image URL for list cards. */
  thumbnail?: string;
  /** glTF/GLB URL for the viewer. */
  source: string;
  /** Config per feature id; overrides what is embedded in the glTF. */
  featureConfig?: Record<string, unknown>;
  /** Free-form data for custom slots. */
  meta?: Record<string, unknown>;
}

export interface ProjectAdapter {
  listProjects(options?: { signal?: AbortSignal }): Promise<Project[]>;
  getProject(id: string, options?: { signal?: AbortSignal }): Promise<Project | undefined>;
}

/** Adapter over an in-memory list, handy for demos, tests and static sites. */
export const createStaticAdapter = (projects: Project[]): ProjectAdapter => ({
  listProjects: async () => projects,
  getProject: async (id) => projects.find((p) => p.id === id),
});
