import type { StorybookConfig } from '@storybook/react-vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { mergeConfig } from 'vite';
import react from '@vitejs/plugin-react';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  staticDirs: ['../public'],
  typescript: { reactDocgen: false },
  viteFinal: (viteConfig) => mergeConfig(viteConfig, {
      plugins: [react({ babel: { configFile: false, babelrc: false } }), nxViteTsPaths()],
    }),
};

export default config;
