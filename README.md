# 3d-studio - Home of the monorepo for webgl library development

The 3d studio provides a WebGL rendering environment for product visualization
based on [Three JS](https://threejs.org).

## Packages

| Package | Purpose |
| --- | --- |
| `@schablone/3d-studio-ui` | Style tokens (`--ds-*`), `ThemeProvider`, slot registry, overlay primitives |
| `@schablone/3d-studio-core` | `<Viewer>`, viewer store, `defineFeature()`, `ProjectAdapter` |
| `@schablone/3d-studio-feature-*` | `skybox`, `wireframe`, `camera-rotation`, `light-scenarios`, `animation`, `highlights` |
| `@schablone/3d-studio` | `<Studio>`, `<ProjectList>`, `<ProjectDetail>`, REST adapter, default feature bundle |

Also in this repo: the glTF extension definition (`libs/gltf-extension`) and
its validator (`libs/gltf-extension-validator`), the Storybook and demo site
(`apps/docs`, published to GitHub Pages) and a minimal Vite app
(`apps/example`).

## Quick start

```tsx
import { Studio, createRestAdapter } from '@schablone/3d-studio';
import '@schablone/3d-studio/style.css';

<Studio adapter={createRestAdapter({ baseUrl: 'https://api.example.com' })} />;
```

Break out at any level: use `<ProjectList>` and `<ProjectDetail>` with your
router, `<Viewer>` with your own `features`, or the primitives from `ui`.
Customize with CSS variables, `ds-*` classes, `data-testid` hooks and slots.
See `docs/v1-plan.md` for the design and `MIGRATION.md` for upgrading from 0.x.

## Development

### Build
Run `npm run build` to create a new build.

### New release
Merging to the `main` branch will automatically create a new release via
semantic-release.
