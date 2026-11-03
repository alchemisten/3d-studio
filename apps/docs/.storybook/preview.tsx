import type { Preview } from '@storybook/react-vite';
import '@schablone/3d-studio-ui/style.css';
import '@schablone/3d-studio-core/style.css';
import '@schablone/3d-studio-feature-animation/style.css';
import '@schablone/3d-studio-feature-beauty-shot/style.css';
import '@schablone/3d-studio-feature-color-switcher/style.css';
import '@schablone/3d-studio-feature-material-variants/style.css';
import { ThemeProvider } from '@schablone/3d-studio-ui';

const preview: Preview = {
  globalTypes: {
    themeMode: {
      description: 'Theme mode',
      toolbar: { title: 'Theme', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { themeMode: 'light' },
  decorators: [
    (Story, { globals }) => (
      <ThemeProvider
        mode={globals.themeMode}
        style={{ display: 'block', padding: '1rem', background: 'var(--ds-color-surface)', minHeight: '100vh' }}
      >
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};

export default preview;
