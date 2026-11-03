# 3d-studio - Home of the monorepo for webgl library development

The 3d studio provides a WebGL rendering environment for product visualization
based on [Three JS](https://threejs.org).

## Packages

| Package                              | Purpose                                                                                                                                                                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@schablone/3d-studio-ui`            | Style tokens (`--ds-*`), `ThemeProvider`, slot registry, 9-region overlay plus `bottom-bar`, Radix-based primitives (Switch, Checkbox, Slider, Select, Segmented, Stepper, Tabs, Accordion, List, ColorSelect, Loader, Button, â€¦) |
| `@schablone/3d-studio-core`          | `<Viewer>`, viewer store, `defineFeature()`, `ProjectAdapter`                                                                                                                                                                       |
| `@schablone/3d-studio-feature-*`     | `skybox`, `wireframe`, `camera-rotation`, `light-scenarios`, `animation`, `highlights`, `floor`, `color-switcher`, `material-variants`, `beauty-shot`                                                                               |
| `@schablone/3d-studio-scene-preview` | Node API and CLI for PNG thumbnails; separate from browser packages                                                                                                                                                                 |
| `@schablone/3d-studio`               | `<Studio>`, `<ProjectList>`, `<ProjectDetail>`, REST adapter, default feature bundle                                                                                                                                                |

Also in this repo: Storybook (`apps/docs`), the Vite sample (`apps/example`), and a TanStack Start + Router SSR example (`apps/example-tanstack`). Both examples use Vite 8.

## Quick start

These instructions target the R3F rewrite described in `MIGRATION.md`; older 0.x packages have a different API. Once a release candidate is published from `develop`, install it in a React 19 application using the explicit `next` tag:

```sh
pnpm add @schablone/3d-studio@next react react-dom three @react-three/fiber @react-three/drei lucide-react rxjs
```

After 1.0.0 is published from `main`, omit `@next` for the stable release. Use `@next` for optional feature packages during RC testing too. The `bootstrap` tag contains placeholders, not usable viewer builds.

These packages are hosted on npmjs. If your user configuration routes `@schablone` to GitLab, use a command-specific override:

```sh
pnpm '--config.@schablone:registry=https://registry.npmjs.org/' add @schablone/3d-studio@next react react-dom three @react-three/fiber @react-three/drei lucide-react rxjs
```

This leaves your saved GitLab configuration unchanged. The override applies to every `@schablone` dependency resolved by that invocation; npm scopes do not provide per-package registry routing.

Use matching versions of all `@schablone/3d-studio*` packages. pnpm installs the internal peer packages automatically with its default settings; if your package manager disables automatic peers, install the dependencies listed in the Studio package manifest explicitly. The validated renderer baseline is Three r187. Beauty Shot requires r187 or later and WebGPU; the regular viewer uses WebGL.

```tsx
import { Studio, createRestAdapter } from '@schablone/3d-studio';
import '@schablone/3d-studio/style.css';

const adapter = createRestAdapter({ baseUrl: 'https://api.example.com' });

<Studio adapter={adapter} />;
```

Give Studio or Viewer a container with a defined height. The Studio stylesheet includes UI, core, animation, and highlight styles. When assembling your own Viewer, import the stylesheets of the packages you use. Optional visual features expose their styles separately when needed.

`createRestAdapter` accepts a project array or `{ projects: [...] }`. Use `mapList` for a different envelope and `mapProject` to translate individual records. Invalid payloads reject the request. List requests use `GET /projects`; details use `GET /projects/:id` with an encoded ID. A missing detail (404) returns `undefined`; other HTTP errors reject. Requests have a 30-second deadline and accept caller cancellation. Custom fetch implementations must forward the supplied abort signal. Keep the adapter instance stable across renders.

To share viewer settings, pass a stable `ViewerQuery` adapter as `viewer.query` on Studio or `query` on Viewer. The host supplies `read`, `replace`, and `subscribe` for its router, and can rename or omit settings through `key(featureId, key)`. Toggle features participate automatically; optional feature settings are declared in `querySettings`. See `apps/example/src/use-scene-settings.ts` for the React Router integration.

Break out at any level: use `<ProjectList>` and `<ProjectDetail>` with your
router, `<Viewer>` with your own `features`, or the primitives from `ui`.
Customize with CSS variables, `ds-*` classes, `data-testid` hooks and slots.
See `CLAUDE.md` for architecture conventions and `MIGRATION.md` for upgrading from 0.x.

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

Use Node from `.nvmrc` and the pnpm version pinned in `package.json`. Run `pnpm install`, then `pnpm start`. Installation enables Husky: staged files are formatted before commits; lint, typecheck and tests run before pushes. CI also audits dependencies and verifies packed packages.

`.env.example` lists optional TLS variables; export them in your shell before starting HTTPS. Renovate configuration groups related dependency updates; the Renovate GitHub app must be enabled for this repository.

For WebGPU on the LAN, set `STUDIO_TLS_CERT` and `STUDIO_TLS_KEY` to PEM files outside the workspace and run `pnpm start:https`. The example listens on port 5175. The certificate must cover the LAN hostname or IP you open. Trust its issuing development CA on each test device.

### Review previews

Run `node tools/scripts/test-shoe-camera.mjs` for the browser regressions. Set `STUDIO_TEST_WEBGPU=1` on a WebGPU-capable machine to include a real Beauty Shot and original/denoised comparison.

Storybook groups examples by Studio scenes, viewer lifecycle, feature interactions, UI primitives, and host integration. The interaction stories open real models and exercise the controls. Run `pnpm exec nx run docs:storybook` locally.

Pages keeps Storybook at the existing version or PR root. The live sample lives under `sample/` at the same root. Scene links and refresh work on a static host using generated entry pages for the sample catalog. Same-repository PR comments link to both previews; closing the PR removes both.

### Build

Run `pnpm run build` to create a new build.

### New release

For one-time package creation, first authenticate to npmjs with `npm login --auth-type=web --registry=https://registry.npmjs.org/` and verify `npm whoami --registry=https://registry.npmjs.org/`. On Windows, use PowerShell if Git Bash exits before browser approval is saved. Run `bash tools/scripts/bootstrap-npm.sh --dry-run` to inspect the offline plan, then omit `--dry-run` to create missing placeholders and configure trusted publishing. The script explicitly overrides both the default and `@schablone` registries for each operation; it does not change saved npm settings.

Releases use two branches: `develop` publishes release candidates (`-rc.N`) to npm's `next` tag; `main` publishes stable versions to `latest`. Both run the same quality gates. Release jobs are serialized, and successful stable releases merge back into `develop` without rewriting history.

Versions come from Conventional Commits and reachable release tags, not the root package version. Preserve the rewrite's `BREAKING CHANGE` when merging or squashing so its first release is 1.0.0. Run `node tools/scripts/test-release-channels.mjs` to verify version/channel selection without publishing.

Publishing requires GitHub release/push permissions and [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) configured for each package against this repository's `release.yml` workflow. The workflow uses OIDC; credentials and trust configuration are managed outside this repository.

npm publication across packages is not atomic. If a release fails mid-publish, inspect the workflow and registry before retrying. Never overwrite or unpublish released versions. Rebuild the exact release commit, verify packed artifacts, and publish only the missing packages with the same version and channel; resolve the GitHub release/tag state before resuming automation. Do not rerun the whole publish target blindly.

> Peer dependencies: `react`, `three`, `@react-three/fiber`, `@react-three/drei` and `lucide-react` (>=0.400). Try the theme playground in Storybook to tune tokens and copy a `createTheme` snippet.
