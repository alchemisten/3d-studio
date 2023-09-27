import { ViewerLauncher } from '@alchemisten/3d-studio-viewer-core';

(function () {
  const container = document.getElementById('viewer-container');
  if (!container) {
    return;
  }

  const launcher = new ViewerLauncher();
  launcher.createCanvasViewer(
    {
      features: {
        CameraRotationFeature: { enabled: true, rotationSpeed: 1 },
        SkyboxFeature: {
          enabled: true,
          skyboxPath: 'assets/textures/environments/blurry',
        },
      },
      objects: [
        {
          name: 'Milk-Truck',
          path: 'assets/models/milk-truck-draco/CesiumMilkTruck.gltf',
        },
      ],
      render: {
        continuousRendering: true,
      },
      project: {
        basedir: 'http://127.0.0.1:4200',
      },
    },
    container
  );
})();
