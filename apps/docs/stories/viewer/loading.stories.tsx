import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SceneLoading } from '@schablone/3d-studio-core';
import { Button } from '@schablone/3d-studio-ui';
import { milkTruck } from '../../../samples/milk-truck';
import { Example, StoryScene } from '../shared/story-scene';

export default { title: 'Viewer/Loading and recovery' } satisfies Meta;
export const LoadingPoster: StoryObj = {
  render: () => (
    <Example
      title="Opening a scene"
      hint="The thumbnail, name, and description stay visible while the model and environment load."
    >
      <SceneLoading {...milkTruck} />
    </Example>
  ),
};
const Recovery = () => {
  const [valid, setValid] = useState(false);
  return (
    <Example
      title="Recover from a missing model"
      hint="Load the available model to recover on the same viewer instance."
    >
      <div className="studio-example__retry">
        <Button onClick={() => setValid(!valid)}>{valid ? 'Try missing model' : 'Load Milk Truck'}</Button>
        <StoryScene scene={milkTruck} source={valid ? milkTruck.source : './models/missing-example.glb'} />
      </div>
    </Example>
  );
};
export const RecoverOnSourceChange: StoryObj = { render: () => <Recovery /> };
