import { ClientOnly, Link, createFileRoute } from '@tanstack/react-router';
import { Overlay, IconButton } from '@schablone/3d-studio-ui';
import { ProjectAdapterProvider, ProjectDetail } from '@schablone/3d-studio';
import { adapter } from '../projects';

export const Route = createFileRoute('/projects/$id')({ component: Detail });

// WebGL only exists in the browser, so the viewer renders on the client; the rest of the page is server-rendered.
function Detail() {
  const { id } = Route.useParams();
  return (
    <ProjectAdapterProvider adapter={adapter}>
      <div style={{ height: '100vh' }}>
        <ClientOnly fallback={<p style={{ padding: 24 }}>Loading viewer…</p>}>
          <ProjectDetail projectId={id} viewer={{ draco: '/draco/', canvasChildren: <ambientLight intensity={2} /> }}>
            <Overlay.TopLeft>
              <Link to="/">
                <IconButton label="Back to projects" icon="←" />
              </Link>
            </Overlay.TopLeft>
          </ProjectDetail>
        </ClientOnly>
      </div>
    </ProjectAdapterProvider>
  );
}
