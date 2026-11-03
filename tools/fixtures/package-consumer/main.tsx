import { useState } from 'react';
import { Viewer } from '@schablone/3d-studio-core';
import { createRoot } from 'react-dom/client';
import { Studio, createRestAdapter } from '@schablone/3d-studio';
import { beautyShot } from '@schablone/3d-studio-feature-beauty-shot';
import '@schablone/3d-studio/style.css';
import '@schablone/3d-studio-feature-beauty-shot/style.css';

const adapter = createRestAdapter({ baseUrl: '/api' });
const beautyFeatures = [
  beautyShot.use({
    enabled: true,
    layout: 'quality',
    initial: 'test',
    presets: [{ id: 'test', label: 'Test', samples: 2, denoise: true }],
  }),
];
const Recovery = () => {
  const [source, setSource] = useState('/missing.gltf');
  return (
    <>
      <button onClick={() => setSource('/demo.gltf')}>Load valid scene</button>
      <Viewer source={source} />
    </>
  );
};
createRoot(document.getElementById('root')!).render(
  location.search === '?recovery' ? (
    <Recovery />
  ) : location.search === '?beauty' ? (
    <Viewer
      source="/demo.gltf"
      features={beautyFeatures}
      canvasChildren={
        <>
          <pointLight position={[3, 4, 5]} intensity={80} />
          <pointLight position={[-3, 2, 1]} intensity={30} />
        </>
      }
    />
  ) : (
    <Studio adapter={adapter} />
  ),
);
