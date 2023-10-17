# 3D Studio Viewer Core

The viewer core provides a 3D product visualization and render application that
can be run standalone or integrated into other applications. The viewer can 
continuously render its canvas to an HTML container or provide a stream of 
base64 encoded image source strings if usage without a browser is desired.

## Architecture

### Modules
* `core`: All basic functionality services, the viewer and the viewer launcher.
* `feature`: Core features as available in the legacy viewer. Also contains the
  feature service and the feature registry, which is responsible for registering
  additional features via the viewer launcher.
* `util`: Utility functions, constants and extension used throughout the 
  application.

### Dependency injection
The viewer core uses dependency injection via [inversify](https://github.com/inversify/InversifyJS)
to provide the core functionality in multiple singleton services. The main 
dependency injection container is managed in the viewer launcher. The viewer
features are also implemented as dependency injection services since they need
access to the core services.

## Usage

Create an instance of the viewer launcher (with optional config) after 
importing the launcher into the desired application 

```javascript
import { ViewerLauncher } from '@alchemisten/3d-studio-viewer-core';

const launcher = new ViewerLauncher();
```

and create one of the available viewers via the launcher.

```javascript
// Get a reference to an HTML element, that will contain the viewer canvas
const container = document.getElementById('viewer-container');

// Canvas viewer with contonuous rendering
const canvasViewer = launcher.createCanvasViewer({
  objects: [
    {
      path: 'path/to/object.gtlf'
    }
  ],
  render: {
    continuousRendering: true,
  }
}, container);

// Image viewer
const images$ = launcher.createImageViewer({
  objects: [
    {
      path: 'path/to/object.gtlf'
    }
  ],
});
images$.subscribe((image) => {
  // Do something with the image
});
```

A config object has to be provided, containing at least the objects which 
should be loaded. Currently, the viewer only support GTLF files. Further 
configuration of the viewer is optionally possible via the config. See 
the corresponding [ViewerConfigModel interface](src/types.ts#L24) and examples for now.

For further usage, see the [examples in the repository](https://github.com/alchemisten/3d-studio/tree/develop/apps/3d-studio-example/src/examples).

## Planed features
Later on viewer configuration can be supplied entirely within the object file
if it is a *.alcm file.
