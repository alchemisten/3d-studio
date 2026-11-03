import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import react from '@vitejs/plugin-react';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  staticDirs: ['../public'],
  typescript: { reactDocgen: false },
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      resolve: { tsconfigPaths: true },
      plugins: [react()],
    }),
};

export default config;
