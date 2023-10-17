# 3d-studio - Home of the monorepo for webgl library development

The 3d studio provides a WebGL rendering environment for product visualization
based on [Three JS](https://threejs.org).

## Packages

This mono repo contains the following packages. See their individual READMEs 
for more details:
* [Viewer Core](libs/viewer-core/README.md): 
  Contains the actual viewer and the core features.
* [Viewer UI](libs/viewer-ui/README.md): 
  Contains a UI for the viewer and the core features.
* [React Website](apps/3d-studio/README.md): 
  Contains a React Website which can be used with a single component with
  minimal configuration.
* [Example](apps/3d-studio-example/README.md): 
  Contains an example application which is used mainly for development, but
  also contains examples for the usage of the viewer and the viewer UI.
* GLTF Extension: Contains the definition for the *.alcm file object which
  extends the default *.gltf file definition with all configuration options
  necessary for the viewer.
* GLTF Extension Validator: TODO
