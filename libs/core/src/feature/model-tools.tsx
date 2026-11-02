import { createContext, Fragment, useContext, type ReactNode } from 'react';
import { useViewerState, type ViewerState } from '../store';

export type ToolSurface = 'menu' | 'inline';

export interface ModelTool {
  id: string;
  available: (state: ViewerState) => boolean;
  render: (surface: ToolSurface) => ReactNode;
}

export class ToolConfigurationError extends Error {}

export const indexModelTools = (tools: readonly ModelTool[]): ReadonlyMap<string, ModelTool> => {
  const index = new Map<string, ModelTool>();
  for (const tool of tools) {
    if (index.has(tool.id)) throw new ToolConfigurationError(`Duplicate model tool: ${tool.id}`);
    index.set(tool.id, tool);
  }
  return index;
};

export const ModelToolContext = createContext<ReadonlyMap<string, ModelTool> | null>(null);

export const useModelTools = (ids?: readonly string[]) => {
  const index = useContext(ModelToolContext);
  return useViewerState((state) => {
    if (!index) return [];
    const requested = ids
      ? ids.map((id) => {
          const tool = index.get(id);
          if (!tool) throw new ToolConfigurationError(`Unknown model tool: ${id}`);
          return tool;
        })
      : [...index.values()];
    return requested.filter((tool) => tool.available(state));
  }, (a, b) => a.length === b.length && a.every((tool, i) => tool === b[i]));
};

export const ModelToolControls = ({ tools, surface }: { tools: readonly ModelTool[]; surface: ToolSurface }) => (
  <>
    {tools.map((tool) => (
      <Fragment key={tool.id}>{tool.render(surface)}</Fragment>
    ))}
  </>
);
