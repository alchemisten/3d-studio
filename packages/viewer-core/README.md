# Viewer Core

The viewer core provides a 3D product visualization and render application that
can be run standalone or integrated into other applications. The viewer can 
continuously render its canvas to an HTML container or provide a stream of 
base64 encoded image source strings if usage without a browser is desired.

## Architecture

### Modules
* `core`: All services basic functionality, the viewer and the viewer launcher.
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

Create an instance of the viewer launcher via the exported global
```javascript
const launcher = alcm.studio();
```
or after importing the launcher into the desired application and create one of
the available viewers via the launcher. A config object has to be provided,
containing at least the objects which should be loaded. Further configuration
of the viewer is optionally possible via the config. See the corresponding 
[ViewerConfigModel interface](src/types.ts#L21) and examples for now.

Later on viewer configuration can be supplied entirely within the object file
if it is an *.alcm file.

## Development

Running `npm start` will serve a live reload development server on `localhost:9000`,
serving the files from the `example` folder. The base files can be used for development,
further examples for specific functionality should receive their own subfolder.