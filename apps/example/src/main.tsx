import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useHref, useNavigate, useParams } from 'react-router-dom';
import { PreviewLights } from '@schablone/3d-studio-core';
import { ProjectList, Studio } from '@schablone/3d-studio';
import '../../samples/styles';
import { useSceneSettings } from './use-scene-settings';
import { sampleFeatures, sampleScenes } from '../../samples/scenes';

const Gallery = () => {
  const scenes = useHref('/scenes/');
  return <ProjectList adapter={sampleScenes} getHref={(scene) => scenes + encodeURIComponent(scene.id)} />;
};

const Scene = () => {
  const { sceneId } = useParams();
  const navigate = useNavigate();
  const query = useSceneSettings();
  return (
    <Studio
      features={sampleFeatures}
      adapter={sampleScenes}
      key={sceneId}
      projectId={sceneId}
      onProjectChange={(id) => navigate(id ? '/scenes/' + encodeURIComponent(id) : '/scenes')}
      viewer={{ query, modelTools: { region: 'middle-left' }, draco: './draco/', canvasChildren: <PreviewLights /> }}
    />
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter basename={new URL(document.baseURI).pathname.replace(/\/$/, '') || '/'}>
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/scenes" element={<Gallery />} />
        <Route path="/scenes/:sceneId" element={<Scene />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
