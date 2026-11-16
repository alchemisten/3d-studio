# Workspace conventions

Public packages intentionally use `@schablone/3d-studio*` and publish to npmjs. Other `@schablone` packages may use GitLab. Package lookup and publication must override both the default and scoped registries without modifying the user's saved npm configuration. npm trust rejects scoped registry flags; use its explicit default registry override for the trust endpoint.

The Nx workspace uses pnpm. The example and Studio stories share their Scenes adapter under `apps/samples`. Scene terminology is user-facing. Existing Project types, adapters, and slot names remain public APIs.

Storybook and both sample apps import `apps/samples/styles.ts` explicitly. Source aliases map public stylesheet exports to their source CSS; do not rely on JavaScript barrel side effects to retain styles in production builds.

Nx 24 uses the separate `@nx/vitest` plugin for test targets. Runtime schemas use Zod 4; use `prefault` when nested defaults must be parsed. Vite 8 builds with Rolldown and Oxc. The TanStack Start example exports `getRouter`. Unused legacy glTF extension packages, their submodule, and Jest scaffolding are removed. Root pnpm overrides upgrade modern glob/minimatch consumers to patched APIs; review them when upgrading their owners.

ESLint uses flat configs and preserves the existing Rules of Hooks and exhaustive-dependencies checks without enabling new React Compiler rules. The import plugin resolves to the maintained `eslint-plugin-import-x` fork. Tracked pnpm patches adapt React/accessibility plugins to minimatch's named export, with `@eslint/compat` bridging their ESLint APIs. Keep the lint compatibility smoke test when refreshing those patches.

Nx's patch replaces removed regex helpers with `Minimatch.match` and uses the exported `filter` helper. Shared samples have their own tsconfig so Vite's native path resolution also covers imports outside either app root.

Publishable Vite libraries use `tools/vite/package-manifest.ts` to emit their authored package metadata, README and license. Nx no longer copies manifests implicitly; the packed-consumer test verifies distributable output.

The optional floor feature fits its contact shadow and radial matte fade to model bounds. Both sample scenes enable it.

The Node-only renderer in `libs/scene-preview` builds an isolated browser entry using the core Viewer. Keep Playwright dependencies out of the browser viewer packages. Sample descriptors, generated thumbnails, and credited models live in the docs public directory shared with the example.

Features register model tools by ID through the core contract. Customize and highlight callouts render those same IDs, while each feature owns material targeting, state and cleanup. The `model.tools` slot remains available for layout overrides. The `modelTools.region` prop places Customize independently of `viewOptions.region`. The example uses `?color=sage` for the Milk Truck body tint.

Authored variants belong to the material-variants package. After an atomic swap it emits `model:materials-changed`; material effects rebind to the active viewer-local instances. Tints, highlights, and URL adapters do not load variant textures.

Feature packages own query codecs. The viewer binds them after feature setup; the host owns router navigation and parameter names. Changes to public packages must pass the external packed-consumer fixture in addition to workspace gates.

Beauty Shot captures the current camera and model for an optional WebGPU still. Keep the tracer and WebGPU renderer behind the render action. Features contribute actions to viewer.output. The host places the Output menu through outputMenu.region; scenes own their rendering presets.

Runtime is pinned in `.nvmrc`; CI reads that pin. Husky formats staged files and runs lint, typecheck and tests before pushes. Keep generated TanStack output ignored. Release preparation must fail before publishing if the manifest or output path is invalid.

Release channels: develop uses rc prereleases on npm next; main uses stable versions on latest. Only main backmerges into develop. Preserve breaking-change commits for major version selection. Publishing validates version/tag pairing; channel tests run without network publication.

The editor package (`libs/feature-editor`) is a split view: `EditorShell` has a top bar, a collapsible sidebar whose tabs are the tools, and the stage. Editor features add tabs through the `editor.tabs` slot (`editorTabSlots`); the shell renders their panels in its own tree, hosts add plain tabs. `Editor` is controlled twice: `value`/`onChange` (finished edits only, one undo entry each; drags and typing are transient until `flush`) and `nav`/`onNavChange` (serializable, `editorNavToSearch`). Viewport behaviour that disturbs editing is switched off through runtime overrides, never by changing the value. Scene settings store only overrides against the resolved feature defaults. `useModelPick` in core reports clicks on the model with point and normal. Theme through the `--ds-editor-*` variables documented in the package README. Highlight descriptions are Markdown with `::video` and `::action` directives: `highlight-content.ts` in feature-highlights parses and writes them (mdast, no raw HTML), the viewer renders them lazily, the editor edits them with TipTap. Canvas helper colours come from the theme (`useHelperColor`), never from literals. Viewer chrome texts are localized through `Viewer` `locale`/`labels` and the `locale`/`labels` config of beauty shot.

`Viewer` takes `source` (loaded, cloned, viewer-owned) or `model` (`{ scene, animations? }`, host-owned: never cloned or disposed, no loading state, published as a minimal `GLTF` by `HostModel`). In-place changes are announced with `ViewerStore.notifyModelChanged({ fit? })`: it raises `modelRevision` and emits `model:changed` and `model:materials-changed`. Whatever a feature derives from the model's content (bounds, mesh lists) depends on `modelRevision` next to `gltf`; the `gltf` object itself stays the same so feature setup and animation do not restart. Features must not assume `gltf.parser` holds a document.

The viewer measures its own frame rate (`libs/core/src/quality`): `QualityWatcher` feeds the pure `createQualityMonitor` with the times between frames rendered on consecutive refreshes and keeps `quality` (`tier`, `fps`, `demoted`, `fixed`) in the store; it never requests frames. Features that depend on the tier call `useQualityProbe` in their scene. Thresholds come from the `quality` prop of `Viewer`.

Ambient occlusion (`libs/feature-ambient-occlusion`) never replaces the scene render and uses no composer or output pass. An invisible mesh that sorts first among the blended objects draws, in its `onBeforeRender`, the model a second time with a multiplying material (depth test, no depth write, alpha untouched) that samples a GTAO texture computed for the model alone (`GTAOPass` of three as a texture generator on a detached scene). Background, tone mapping, colour space and MSAA are therefore those of the plain render; keep it that way. The layer is mounted only while the effect is wanted. Verify changes with the corner-pixel and helper checks of the Storybook story `Features/Ambient occlusion` (`window.occlusionStory`).
