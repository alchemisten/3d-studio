import { ViewerLauncher } from '@alchemisten/3d-studio-viewer-core';
import { AlternativeLoggerService } from './logger';

(function () {
  const container = document.getElementById('viewer-container');
  if (!container) {
    return;
  }

  const launcher = new ViewerLauncher({
    customManager: {
      logger: AlternativeLoggerService,
    },
    loggerOptions: {
      environment: 'develop',
    },
  });
  launcher.createCanvasViewer(
    {
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
