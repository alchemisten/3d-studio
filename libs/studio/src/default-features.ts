import type { FeatureInput } from '@schablone/3d-studio-core';
import { animation } from '@schablone/3d-studio-feature-animation';
import { cameraRotation } from '@schablone/3d-studio-feature-camera-rotation';
import { highlights } from '@schablone/3d-studio-feature-highlights';
import { lightScenarios } from '@schablone/3d-studio-feature-light-scenarios';
import { skybox } from '@schablone/3d-studio-feature-skybox';
import { wireframe } from '@schablone/3d-studio-feature-wireframe';

/** Every feature, configured by the glTF extensions and the project's `featureConfig`. */
export const defaultFeatures: FeatureInput[] = [skybox, wireframe, cameraRotation, lightScenarios, animation, highlights];
