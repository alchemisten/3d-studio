# 3D Studio v1: React Three Fiber rewrite

Breaking, in-place rewrite. No backward compatibility with 0.x APIs or data formats.

## Goals

1. Batteries-included project list and detail views with minimal config.
2. Always able to break out to custom cases; every building block is exported.
3. Layered CSS-variable design tokens for customization.
4. Typed slot system to prepend, append or replace UI in the list, detail view and viewer.
5. 9-region 3D overlay that is easy to extend (JSX and registry API).
6. Features are packages; their config can travel inside the glTF.
7. SSR-safe (TanStack Start + Router example). React is a hard dependency.

## Decisions

| Topic | Decision |
|---|---|
| 3D | `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` |
| State / DI | Inversify dropped. Per-viewer store via React context + typed hooks. RxJS kept; the store exposes observables (`viewer.select$()`, `viewer.events$`) for tapping. |
| Styling | Plain CSS / CSS modules, `--ds-*` variables, layers: primitive, semantic, component |
| i18n | `react-intl` kept; per-package message catalogs overridable via provider |
| Data | Pluggable `ProjectAdapter` (`listProjects`, `getProject`), default REST adapter (react-query) |
| Tooling | Nx, Vite (library mode, ESM only), Vitest, Storybook |
| SSR | No `window`/`document` access at import time; client-only parts behind effects / lazy |

## Packages (`libs/`)

| Package | Name | Contents | three? |
|---|---|---|---|
| `ui` | `@schablone/3d-studio-ui` | tokens, `ThemeProvider`, slot registry (`SlotProvider`, `Slot`, `useSlot`), overlay primitives (`Overlay`, `IconButton`, `Menu`, `Toolbar`, `Panel`, `Tooltip`) | no |
| `core` | `@schablone/3d-studio-core` | `<Viewer>`, viewer store, `defineFeature()`, glTF extension reader, `ProjectAdapter`, overlay wiring | yes |
| `feature-*` | `@schablone/3d-studio-feature-{highlights,light-scenarios,skybox,wireframe,camera-rotation,animation}` | one feature each | yes |
| `studio` | `@schablone/3d-studio` | `<Studio>`, `<ProjectList>`, `<ProjectDetail>`, REST adapter, default feature bundle | yes |

Dependency direction: `ui` <- `core` <- `feature-*` <- `studio`. `studio` re-exports the pieces for breakout.

## Core concepts

### Tokens
`primitive` (`--ds-color-blue-500`, `--ds-space-2`) -> `semantic` (`--ds-color-accent`, `--ds-surface`) -> `component` (`--ds-button-radius`).
`<ThemeProvider theme={...}>` scopes tokens per subtree (per viewer). `createTheme()` is typed; light and dark ship by default.

### Slots
Typed registry, extended by module augmentation of `SlotMap`.
Fill via props (`<Viewer slots={{...}}>`), via a feature's `slots`, or `<Slot.Fill name=...>`. Modes: `prepend | append | replace`, plus `order`.
Initial names: `project-list.header`, `project-list.card.{media,footer,actions}`, `project-detail.{header,sidebar,footer}`, `viewer.loading`, `viewer.error`, `overlay.*`.

### Overlay
Regions: `top-left top-center top-right middle-left center middle-right bottom-left bottom-center bottom-right`.
- JSX: `<Overlay.TopRight><IconButton icon=... /></Overlay.TopRight>`
- Registry: `useOverlay().add('top-right', { id, icon, onClick, order })`

Items stack per region with `order`; regions collapse when empty.

### Features
```ts
defineFeature({
  id: 'highlights',
  config: schema,                          // typed per-feature config
  gltf: { extension: 'ALCM_highlights' },  // default source of config; props/adapter override
  scene: HighlightsScene,                  // rendered inside <Canvas>
  slots: { 'overlay.bottom-center': ... },
  setup(ctx) { /* ctx.viewer, ctx.events$ */ },
});
```
Registered through `<Viewer features={[...]}>`. Config precedence: props > adapter > glTF extension > defaults.

### glTF extension
`libs/gltf-extension` (+ validator) stay. Format may change; each feature owns its extension schema.

## Phases

| # | Phase | Output |
|---|---|---|
| 0 | Branch, plan | this doc |
| 1 | `ui`: tokens, theme, slots, overlay primitives | package + tests |
| 2 | `core`: `<Viewer>`, store, feature API, glTF config reader, adapter interface | package + tests |
| 3 | **Check-in:** feature ports, one by one | `feature-*` packages |
| 4 | `studio`: list, detail, REST adapter, `<Studio>` | package |
| 5 | Example apps (Vite, TanStack Start + Router), Storybook docs | apps |
| 6 | Remove `viewer-core`, `viewer-ui`, `react-website`; migration notes; fix release (`npmPublish: false`, trusted publishing) | v1.0.0 |

## Check-in points

Per feature port, agree on: public config shape, glTF extension name/schema, slots offered, overlay items contributed, what is exposed on the store. Order: skybox, wireframe, camera-rotation, light-scenarios, animation, highlights.

## Out of scope (for now)

Embed builder port, non-glTF formats.

## Feature port status

Ported: skybox, wireframe, camera-rotation, light-scenarios, animation, highlights.
Highlights anchors (`anchor` = click position, `target` = what it means) are either static world positions or attached to a node and follow animations. Hotspots are DOM buttons in the `viewer.layer` slot, positioned from the scene each frame.
