# Migrating from 0.x to 1.0

1.0 is a rewrite on React Three Fiber. There is no backward compatibility,
including data formats.

| 0.x | 1.0 |
| --- | --- |
| `viewer-core` (three.js, Inversify) | `@schablone/3d-studio-core` (`<Viewer>`, R3F, React context) |
| `viewer-ui` | `@schablone/3d-studio-ui` and per-feature UI |
| `react-website` | `@schablone/3d-studio` (`<Studio>`, `<ProjectList>`, `<ProjectDetail>`) |
| Features registered in a service | `defineFeature()` manifests, passed as `features` |
| Config from the glTF only | props > adapter `featureConfig` > glTF extension > defaults |
| Custom UI by forking | Slots, `ds-*` classes, `--ds-*` tokens |
| `3d-studio-example` app | `apps/example` (Vite) and Storybook |

Requirements: React 19, `@react-three/fiber` 9, `@react-three/drei` 10 and
three >= 0.162. The embed builder is no longer part of this repo.

Feature notes:
- Highlights: `anchor` and `target` are `{ position }` or `{ node, offset? }`; `teleport` is gone (seek always jumps); `visibility.whenPlaying` became `visibility.state`.
- Animation: cues, per-clip config and `animation:*` events replace direct service calls.
