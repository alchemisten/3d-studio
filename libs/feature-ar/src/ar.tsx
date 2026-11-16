import { useEffect, useState } from 'react';
import { defineFeature, type ViewerStore } from '@schablone/3d-studio-core';
import { IconButton } from '@schablone/3d-studio-ui';
import { Box } from 'lucide-react';
import { ArDialog } from './ar-dialog';
import { resolveArLabels } from './ar-i18n';
import { arConfig, type ArConfig, type EnabledArConfig } from './config';
import { type ArEnvironment, detectArEnvironment } from './device-detection';
import { AR_FEATURE_ID, useAr } from './use-ar';

interface ArEntryProps {
  viewer: ViewerStore;
  label: string;
}

const ArAction = ({ viewer, label }: ArEntryProps) => (
  <button
    type="button"
    role="menuitem"
    className="ds-menu__item"
    data-testid="ds-ar-action"
    onClick={() => viewer.emit('ar:open', undefined)}
  >
    <Box size={16} aria-hidden="true" /> {label}
  </button>
);

const ArButton = ({ viewer, label }: ArEntryProps) => (
  <IconButton
    className="ds-ar-button"
    data-testid="ds-ar-button"
    label={label}
    icon={<Box size={18} aria-hidden="true" />}
    onClick={() => viewer.emit('ar:open', undefined)}
  />
);

export interface ArLayerProps {
  viewer: ViewerStore;
  config: EnabledArConfig;
  /** Defaults to the device the page runs on. */
  environment?: ArEnvironment;
}

/**
 * Owns the AR dialogs. The launch runs in the same call stack as the tap on
 * the entry point, because Quick Look and Scene Viewer only open from a user gesture.
 */
export const ArLayer = ({ viewer, config, environment }: ArLayerProps) => {
  const [detected] = useState(detectArEnvironment);
  const device = environment ?? detected;
  const api = useAr({ config, environment: device, viewer });
  const { open } = api;

  useEffect(() => {
    const subscription = viewer.on$('ar:open').subscribe(open);
    return () => subscription.unsubscribe();
  });

  return <ArDialog ar={api} platform={device.platform} />;
};

export const ar = defineFeature<ArConfig>({
  id: AR_FEATURE_ID,
  config: arConfig,
  slots: ({ viewer, config }) => {
    if (!config.enabled) return {};
    const label = resolveArLabels(config.locale, config.labels).view;
    return {
      ...(config.placement === 'output'
        ? { 'viewer.output': { mode: 'append' as const, content: <ArAction viewer={viewer} label={label} /> } }
        : {
            'overlay.top-right': {
              mode: 'append' as const,
              order: 90,
              content: <ArButton viewer={viewer} label={label} />,
            },
          }),
      'viewer.layer': { mode: 'append' as const, content: <ArLayer viewer={viewer} config={config} /> },
    };
  },
});
