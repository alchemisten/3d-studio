# 3d-studio - Home of the monorepo for webgl library development

The 3d studio provides a WebGL rendering environment for product visualization
based on [Three JS](https://threejs.org).

## Packages

| Package | Purpose |
| --- | --- |
| `@schablone/3d-studio-ui` | Style tokens (`--ds-*`), `ThemeProvider`, slot registry, 9-region overlay plus `bottom-bar`, Radix-based primitives (Switch, Checkbox, Slider, Select, Segmented, Stepper, Tabs, Accordion, List, ColorSelect, Loader, Button, …) |
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

## Development

### Review previews
Storybook groups examples by Studio scenes, viewer lifecycle, feature interactions, UI primitives, and host integration. The interaction stories open real models and exercise the controls. Run `pnpm exec nx run docs:storybook` locally.

Pages keeps Storybook at the existing version or PR root. The live sample lives under `sample/` at the same root. Scene links and refresh work on a static host using generated entry pages for the sample catalog. Same-repository PR comments link to both previews; closing the PR removes both.

### Build
Run `pnpm run build` to create a new build.

### New release
Merging to the `main` branch will automatically create a new release via
semantic-release.

> Peer dependencies: `react`, `three`, `@react-three/fiber`, `@react-three/drei` and `lucide-react` (>=0.400). Try the theme playground in Storybook to tune tokens and copy a `createTheme` snippet.
