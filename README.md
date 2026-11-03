# 3d-studio - Home of the monorepo for webgl library development

The 3d studio provides a WebGL rendering environment for product visualization
based on [Three JS](https://threejs.org).

## Packages

| Package | Purpose |
| --- | --- |
| `@schablone/3d-studio-ui` | Style tokens (`--ds-*`), `ThemeProvider`, slot registry, 9-region overlay plus `bottom-bar`, Radix-based primitives (Switch, Checkbox, Slider, Select, Segmented, Stepper, Tabs, Accordion, List, ColorSelect, Loader, Button, â€¦) |
| `@schablone/3d-studio-core` | `<Viewer>`, viewer store, `defineFeature()`, `ProjectAdapter` |
| `@schablone/3d-studio-feature-*` | `skybox`, `wireframe`, `camera-rotation`, `light-scenarios`, `animation`, `highlights` |
| `@schablone/3d-studio` | `<Studio>`, `<ProjectList>`, `<ProjectDetail>`, REST adapter, default feature bundle |

Also in this repo: the glTF extension definition (`libs/gltf-extension`) and
its validator (`libs/gltf-extension-validator`), the Storybook and demo site
(`apps/docs`, published to GitHub Pages) and a minimal Vite app
(`apps/example`) and a TanStack Start + Router app with SSR
(`apps/example-tanstack`, `nx serve example-tanstack`). The Start example pins
`@tanstack/react-start` 1.131 because newer versions require Vite 8.

## Quick start

```tsx
import { Studio, createRestAdapter } from '@schablone/3d-studio';
import '@schablone/3d-studio/style.css';

<Studio adapter={createRestAdapter({ baseUrl: 'https://api.example.com' })} />;
```

Give Studio or Viewer a container with a defined height. The Studio stylesheet includes UI, core, animation, and highlight styles. When assembling your own Viewer, import the stylesheets of the packages you use. Optional visual features expose their styles separately when needed.

`createRestAdapter` accepts a project array or `{ projects: [...] }`. Use `mapList` for a different envelope and `mapProject` to translate individual records. Invalid payloads reject the request.

To share viewer settings, pass a stable `ViewerQuery` adapter as `viewer.query` on Studio or `query` on Viewer. The host supplies `read`, `replace`, and `subscribe` for its router, and can rename or omit settings through `key(featureId, key)`. Toggle features participate automatically; optional feature settings are declared in `querySettings`. See `apps/example/src/use-scene-settings.ts` for the React Router integration.

Break out at any level: use `<ProjectList>` and `<ProjectDetail>` with your
router, `<Viewer>` with your own `features`, or the primitives from `ui`.
Customize with CSS variables, `ds-*` classes, `data-testid` hooks and slots.
See `docs/v1-plan.md` for the design and `MIGRATION.md` for upgrading from 0.x.

### Beauty Shot

Add the optional `@schablone/3d-studio-feature-beauty-shot` package to a viewer using Three r187 or later and import its `style.css`. The Toy Car example enables the feature. Rendering requires WebGPU on a secure origin (HTTPS or localhost). The interactive viewer uses WebGL. The WebGPU renderer and tracer load when rendering begins.

```tsx
beautyShot.use({
  enabled: true,
  layout: 'quality',
  initial: 'catalog',
  presets: [{ id: 'catalog', label: 'Catalog', samples: 64, denoise: true }],
});
```

Output actions appear in the top-right menu. Set `viewer.outputMenu.region` to move it. Features can append actions to `viewer.output`. Use `direct` for a single action, `quality` for a preset picker, or `details` to expose samples and grain reduction. Scenes can supply the same settings in `featureConfig['beauty-shot']`. Capture uses the current camera, model materials, environment and viewport size. Grain reduction applies an edge-preserving filter to the finished image.

## Development

For WebGPU on the LAN, set `STUDIO_TLS_CERT` and `STUDIO_TLS_KEY` to PEM files outside the workspace and run `pnpm start:https`. The example listens on port 5175. The certificate must cover the LAN hostname or IP you open. Trust its issuing development CA on each test device.

### Review previews
Run `node tools/scripts/test-shoe-camera.mjs` for the browser regressions. Set `STUDIO_TEST_WEBGPU=1` on a WebGPU-capable machine to include a real Beauty Shot and original/denoised comparison.

Storybook groups examples by Studio scenes, viewer lifecycle, feature interactions, UI primitives, and host integration. The interaction stories open real models and exercise the controls. Run `pnpm exec nx run docs:storybook` locally.

Pages keeps Storybook at the existing version or PR root. The live sample lives under `sample/` at the same root. Scene links and refresh work on a static host using generated entry pages for the sample catalog. Same-repository PR comments link to both previews; closing the PR removes both.

### Build
Run `pnpm run build` to create a new build.

### New release
Merging to the `main` branch will automatically create a new release via
semantic-release.

> Peer dependencies: `react`, `three`, `@react-three/fiber`, `@react-three/drei` and `lucide-react` (>=0.400). Try the theme playground in Storybook to tune tokens and copy a `createTheme` snippet.
