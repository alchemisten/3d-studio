import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ProjectAdapterProvider, ProjectList } from '@schablone/3d-studio';
import { adapter } from '../projects';

export const Route = createFileRoute('/')({ component: Home });

// The list is router-agnostic: cards are plain links (`getHref`), and `onSelect` navigates client-side.
function Home() {
  const navigate = useNavigate();
  return (
    <ProjectAdapterProvider adapter={adapter}>
      <ProjectList
        getHref={(p) => `/projects/${p.id}`}
        onSelect={(p) => void navigate({ to: '/projects/$id', params: { id: p.id } })}
        slots={{ 'project-list.header': <h1>Scenes</h1> }}
      />
    </ProjectAdapterProvider>
  );
}
