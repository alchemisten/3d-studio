import { defineFeature } from '@schablone/3d-studio-core';
import { offlineConfig, type OfflineConfig } from './config';
import type { Connectivity } from './core/connectivity';
import { createOfflineController, type OfflineController } from './core/offline-controller';
import { browserConnectivity, resolveBrowserEnvironment } from './host/browser-environment';
import { offlineMessages } from './messages';
import { OfflineButton } from './offline-button';
import { OfflineActions, OfflineStatus } from './offline-controls';

interface OfflineSession {
  controller: OfflineController;
  connectivity: Connectivity;
}

const sessions = new WeakMap<OfflineConfig, OfflineSession>();

const sessionFor = (config: OfflineConfig): OfflineSession => {
  const existing = sessions.get(config);
  if (existing) return existing;
  const connectivity = browserConnectivity();
  const session = {
    connectivity,
    controller: createOfflineController({
      projectId: config.projectId,
      assets: config.assets.map((url) => new URL(url, window.location.href).href),
      resolveEnvironment: () => resolveBrowserEnvironment(config.scope),
      connectivity,
      now: () => new Date().toISOString(),
    }),
  };
  sessions.set(config, session);
  return session;
};

/**
 * Adds the offline button to the bottom-right overlay corner, or with `placement: 'output'` the actions to the
 * Output menu and a status badge to the top-right corner.
 * Needs the offline worker of this package registered for the page; without it the control is disabled.
 */
export const offline = defineFeature<OfflineConfig>({
  id: 'offline',
  config: offlineConfig,
  setup: ({ config }) => (config.enabled ? sessionFor(config).controller.start() : undefined),
  slots: ({ config }) => {
    if (!config.enabled) return {};
    const { controller, connectivity } = sessionFor(config);
    const messages = offlineMessages[config.locale];
    if (config.placement === 'bottom-right') {
      return {
        'overlay.bottom-right': {
          mode: 'append',
          order: 90,
          content: <OfflineButton controller={controller} connectivity={connectivity} messages={messages} />,
        },
      };
    }
    return {
      'viewer.output': { mode: 'append', content: <OfflineActions controller={controller} messages={messages} /> },
      'overlay.top-right': {
        mode: 'append',
        order: 90,
        content: <OfflineStatus controller={controller} connectivity={connectivity} messages={messages} />,
      },
    };
  },
});
