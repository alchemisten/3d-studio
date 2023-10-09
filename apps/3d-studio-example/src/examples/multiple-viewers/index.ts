import { ViewerLauncher } from '@alchemisten/3d-studio-viewer-core';
import { Vector3 } from 'three';
import { Logger } from '@schablone/logging';

(function () {
  const containerOne = document.getElementById('viewer-container-one');
  const containerTwo = document.getElementById('viewer-container-two');
  if (!containerOne || !containerTwo) {
    return;
  }

  const launcherOne = new ViewerLauncher({
    logger: new Logger({
      environment: 'local',
    }),
  });
  launcherOne.createCanvasViewer(
    {
      features: {
        WireframeFeature: { enabled: true },
      },
      objects: [
        {
          name: 'Milk-Truck',
          path: '../../../assets/models/milk-truck-draco/CesiumMilkTruck.gltf',
        },
      ],
    },
    containerOne
  );

  const launcherTwo = new ViewerLauncher({
    logger: new Logger({
      environment: 'local',
    }),
  });
  launcherTwo.createCanvasViewer(
    {
      camera: {
        fov: 90,
        position: new Vector3(-5, 2, -1),
      },
      features: {
        WireframeFeature: { enabled: false },
      },
      objects: [
        {
          name: 'Milk-Truck',
          path: '../../../assets/models/milk-truck-draco/CesiumMilkTruck.gltf',
        },
      ],
    },
    containerTwo
  );
})();
