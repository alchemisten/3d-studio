# Scene previews

This package runs in Node, not in a browser bundle. Install `@schablone/3d-studio-scene-preview`; TypeScript consumers also need `@types/node`. If your tsconfig restricts `compilerOptions.types`, include `node` in the server configuration. Keep this package out of browser entry points.

Build the Node renderer and its browser bundle with `pnpm exec nx build 3d-studio-scene-preview`. Install a Chromium browser with the package's Playwright Core CLI, or set `SCENE_BROWSER_CHANNEL=msedge` to use installed Edge.

From the repository root:

```sh
node dist/libs/scene-preview/cli.js apps/docs/public/previews/milk-truck.json milk-truck.png
```

When installed as a package, the command is `scene-preview descriptor.json output.png`. The Node API returns a PNG buffer:

```ts
import { renderScene } from '@schablone/3d-studio-scene-preview';

const png = await renderScene(
  {
    source: './truck.gltf',
    draco: './draco/',
    preview: { width: 640, height: 360, background: '#e1e8e7' },
  },
  { baseDir: assetDirectory, channel: 'msedge' },
);
```

The CLI resolves local paths against the descriptor directory. The API defaults to the current working directory. Model sidecars resolve relative to the model. A URL source must permit browser CORS. Use local decoder files for offline Draco rendering.

The default capture is transparent, 960 × 540, with the camera fitted to the scene. Supply `preview.camera` with `position` and `target` triples for a fixed pose. Supply `preview.animation` with a named `clip` and `time` in seconds to capture an animated pose. The packaged browser uses the Studio viewer with fixed preview lighting.
Set `preview.floor.mode` to `shadow`, `matte`, or `off`. The optional `preview.floor.color` sets the matte tint. The renderer captures the contact shadow after applying the animation pose.
