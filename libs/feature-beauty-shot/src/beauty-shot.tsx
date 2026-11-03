import { defineFeature, useViewer, useViewerState } from '@schablone/3d-studio-core';
import { Camera } from 'lucide-react';
import { BeautyControls } from './beauty-controls';
import { CaptureSource } from './capture-source';
import { beautyConfig, type BeautyConfig } from './config';

declare module '@schablone/3d-studio-core' {
  interface ViewerEventMap {
    'beauty-shot:open': undefined;
  }
}

const BeautyAction = () => {
  const viewer = useViewer();
  const ready = useViewerState(state => state.status === 'ready');
  return <button disabled={!ready} type="button" role="menuitem" className="ds-menu__item"
    onClick={() => viewer.emit('beauty-shot:open', undefined)}><Camera size={16} /> Beauty shot</button>;
};

export const beautyShot = defineFeature<BeautyConfig>({
  id: 'beauty-shot',
  config: beautyConfig,
  scene: CaptureSource,
  slots: ({ viewer, config }) =>
    config.enabled
      ? {
          'viewer.output': {
            mode: 'append',
            content: <BeautyAction />,
          },
          'viewer.layer': { mode: 'append', content: <BeautyControls viewer={viewer} config={config} /> },
        }
      : {},
});
