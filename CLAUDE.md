# Workspace conventions

The Nx workspace uses pnpm. The example and Studio stories share their Scenes adapter under `apps/samples`. Scene terminology is user-facing. Existing Project types, adapters, and slot names remain public APIs.

The optional floor feature fits its contact shadow and radial matte fade to model bounds. Both sample scenes enable it.

The Node-only renderer in `libs/scene-preview` builds an isolated browser entry using the core Viewer. Keep Playwright dependencies out of the browser viewer packages. Sample descriptors, generated thumbnails, and credited models live in the docs public directory shared with the example.

Features register model tools by ID through the core contract. Customize and highlight callouts render those same IDs, while each feature owns material targeting, state and cleanup. The `model.tools` slot remains available for layout overrides. The `modelTools.region` prop places Customize independently of `viewOptions.region`. The example uses `?color=sage` for the Milk Truck body tint.

Authored variants belong to the material-variants package. After an atomic swap it emits `model:materials-changed`; material effects rebind to the active viewer-local instances. Tints, highlights, and URL adapters do not load variant textures.

Feature packages own query codecs. The viewer binds them after feature setup; the host owns router navigation and parameter names. Changes to public packages must pass the external packed-consumer fixture in addition to workspace gates.

Beauty Shot captures the current camera and model for an optional WebGPU still. Keep the tracer and WebGPU renderer behind the render action. Features contribute actions to viewer.output. The host places the Output menu through outputMenu.region; scenes own their rendering presets.
