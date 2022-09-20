import { ViewerLauncher } from '@alchemisten/3d-studio-viewer-core';

(function () {
  const container = document.getElementById('viewer-container');
  if (!container) {
    return;
  }

  const launcher = new ViewerLauncher();
  launcher.createHTMLViewer(container, {
    features: {
      CameraRotationFeature: { enabled: false },
      WireframeFeature: { enabled: false },
    },
    objects: [
      {
        name: 'Milk-Truck',
        path: 'assets/models/milk-truck-draco/CesiumMilkTruck.gltf',
      },
    ],
    project: {
      basedir: 'localhost:9000',
      folder: 'test123',
      introText: {
        de: {
          intro: 'Stuff',
        },
      },
      languages: ['de'],
      name: 'A test project',
      projectID: 'TEST123',
    },
    render: {
      continuousRendering: false,
    },
  });
})();
