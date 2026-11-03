import { ClientOnly, Link, createFileRoute } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Overlay, Tooltip } from '@schablone/3d-studio-ui';
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
              <Tooltip label="Back to scenes">
                <Link to="/" className="ds-icon-button" aria-label="Back to scenes">
                  <span className="ds-icon-button__icon">
                    <ArrowLeft size={20} aria-hidden="true" />
                  </span>
                </Link>
              </Tooltip>
            </Overlay.TopLeft>
          </ProjectDetail>
        </ClientOnly>
      </div>
    </ProjectAdapterProvider>
  );
}
