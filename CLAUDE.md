# Workspace conventions

The Nx workspace uses pnpm. The example and Studio stories share their Scenes adapter under `apps/samples`. Scene terminology is user-facing. Existing Project types, adapters, and slot names remain public APIs.

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
