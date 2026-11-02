import { PreviewLights, Viewer, type Project, type ViewerProps } from '@schablone/3d-studio-core';
import type { ReactNode } from 'react';
import { sampleFeatures } from '../../../samples/scenes';
import './story-scene.css';

export const Example = ({ title, hint, children }: { title: string; hint: string; children: ReactNode }) => (
  <section className="studio-example">
    <header>
      <h2>{title}</h2>
      <p>{hint}</p>
    </header>
    <div className="studio-example__stage">{children}</div>
  </section>
);

export const StoryScene = ({ scene, ...props }: { scene: Project } & Partial<ViewerProps>) => (
  <Viewer
    source={scene.source}
    openingCamera={scene.openingCamera}
    draco="./draco/"
    features={sampleFeatures}
    featureConfig={scene.featureConfig}
    canvasChildren={<PreviewLights />}
    {...props}
  />
);
