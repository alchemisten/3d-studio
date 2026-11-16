import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { type Mesh, NeutralToneMapping } from 'three';
import { type QualityTier, useViewer, useViewerState, Viewer, type ViewerStore } from '@schablone/3d-studio-core';
import { ambientOcclusion, type AmbientOcclusionMode } from '@schablone/3d-studio-feature-ambient-occlusion';
import { floor } from '@schablone/3d-studio-feature-floor';
import { wireframe } from '@schablone/3d-studio-feature-wireframe';
import { Example } from '../shared/story-scene';
import { createRibbedTrayUrl } from './ribbed-tray';

interface OcclusionStoryProps {
  mode: AmbientOcclusionMode;
  intensity: number;
  radius: number;
  whenResting: boolean;
  /** `measured` lets the quality monitor decide; a tier fixes it. */
  quality: 'measured' | QualityTier;
  frameloop: 'always' | 'demand';
  helpers: boolean;
  locale: 'en' | 'de';
}

declare global {
  interface Window {
    /** Lets browser checks read pixels and drive the canvas of this story. */
    occlusionStory?: { viewer: ViewerStore; three: () => ReturnType<typeof useThree> };
  }
}

const features = [ambientOcclusion, floor.use({ mode: 'shadow' }), wireframe];

/** The host's stage: white background, a key light with soft shadows and an invisible shadow catcher. */
const Stage = ({ helpers }: { helpers: boolean }) => {
  const viewer = useViewer();
  const gltf = useViewerState((state) => state.gltf);
  const get = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    gltf?.scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    invalidate();
  }, [gltf, invalidate]);

  useEffect(() => {
    window.occlusionStory = { viewer, three: get };
    return () => {
      delete window.occlusionStory;
    };
  }, [viewer, get]);

  return (
    <>
      <color attach="background" args={['#ffffff']} />
      <hemisphereLight args={['#ffffff', '#d8dde2', 2.4]} />
      <directionalLight
        position={[0.6, 1.4, 0.9]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-radius={4}
        shadow-bias={-0.0005}
      >
        <orthographicCamera attach="shadow-camera" args={[-0.7, 0.7, 0.7, -0.7, 0.2, 4]} />
      </directionalLight>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.0005, 0]} receiveShadow>
        <planeGeometry args={[4, 4]} />
        <shadowMaterial opacity={0.25} />
      </mesh>
      {helpers && (
        <group name="StoryHelpers">
          <axesHelper args={[0.25]} position={[-0.1, 0.17, -0.05]} />
          <sprite position={[0.1, 0.19, 0.05]} scale={[0.06, 0.06, 0.06]}>
            <spriteMaterial color="#ff5a1f" />
          </sprite>
          <mesh position={[-0.15, 0.07, 0.1]} renderOrder={10}>
            <sphereGeometry args={[0.02, 24, 16]} />
            <meshBasicMaterial color="#1f9d55" depthTest={false} transparent />
          </mesh>
        </group>
      )}
    </>
  );
};

const Occlusion = ({
  mode,
  intensity,
  radius,
  whenResting,
  quality,
  frameloop,
  helpers,
  locale,
}: OcclusionStoryProps) => {
  const [source, setSource] = useState<string>();

  useEffect(() => {
    let url: string | undefined;
    let isCurrent = true;
    createRibbedTrayUrl().then((created) => {
      url = created;
      if (isCurrent) setSource(created);
      else URL.revokeObjectURL(created);
    });
    return () => {
      isCurrent = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  return (
    <Example
      title="Read the depth of a part"
      hint="Ambient occlusion darkens ribs, pockets and creases of the model only. The white stage, its shadow catcher and helpers stay untouched. Auto follows the measured quality tier."
    >
      {source && (
        <Viewer
          key={`${mode}-${quality}-${frameloop}`}
          source={source}
          draco={false}
          locale={locale}
          openingCamera={{ position: [0.4, 0.4, 0.5], target: [0, 0.06, 0] }}
          quality={quality === 'measured' ? undefined : { tier: quality }}
          features={features}
          featureConfig={{ 'ambient-occlusion': { mode, intensity, radius, whenResting, locale } }}
          canvas={{ shadows: 'variance', frameloop, gl: { toneMapping: NeutralToneMapping } }}
          canvasChildren={<Stage helpers={helpers} />}
        />
      )}
    </Example>
  );
};

const meta = {
  title: 'Features/Ambient occlusion',
  component: Occlusion,
  args: {
    mode: 'auto',
    intensity: 1,
    radius: 0.06,
    whenResting: true,
    quality: 'measured',
    frameloop: 'demand',
    helpers: false,
    locale: 'en',
  },
  argTypes: {
    mode: { control: 'inline-radio', options: ['auto', 'on', 'off'] },
    intensity: { control: { type: 'range', min: 0, max: 2, step: 0.05 } },
    radius: { control: { type: 'range', min: 0.01, max: 0.2, step: 0.01 } },
    quality: { control: 'inline-radio', options: ['measured', 'high', 'reduced', 'off'] },
    frameloop: { control: 'inline-radio', options: ['always', 'demand'] },
    locale: { control: 'inline-radio', options: ['en', 'de'] },
  },
} satisfies Meta<typeof Occlusion>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Adaptive: Story = {};
export const AlwaysOn: Story = { args: { mode: 'on' } };
export const Off: Story = { args: { mode: 'off' } };
export const ReducedTier: Story = { args: { quality: 'reduced' } };
export const WithHelpers: Story = { args: { mode: 'on', helpers: true } };
export const WhileMoving: Story = { args: { mode: 'on', whenResting: false, frameloop: 'always' } };
