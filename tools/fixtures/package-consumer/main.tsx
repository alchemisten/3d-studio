import { useState } from 'react';
import { Viewer } from '@schablone/3d-studio-core';
import { createRoot } from 'react-dom/client';
import { Studio, createRestAdapter } from '@schablone/3d-studio';
import '@schablone/3d-studio/style.css';

const adapter = createRestAdapter({ baseUrl: '/api' });
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
  location.search === '?recovery' ? <Recovery /> : <Studio adapter={adapter} />,
);
