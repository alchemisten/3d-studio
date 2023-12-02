import { ViewerLauncher } from '@schablone/3d-studio-viewer-core';

(function () {
  const container = document.getElementById('viewer-container');
  if (!container) {
    return;
  }

  const launcher = new ViewerLauncher({
    loggerOptions: {
      environment: 'local',
    },
  });
  const renderSize = { width: 1024, height: 768 }; // Defines size of rendering
  const images$ = launcher.createImageViewer({
    objects: [
      {
        name: 'Milk-Truck',
        path: '../../../assets/models/milk-truck-draco/CesiumMilkTruck.gltf',
      },
    ],
    render: {
      renderSize,
    },
  });
  const image = document.createElement('img');
  image.width = renderSize.width;
  image.height = renderSize.height;
  container.appendChild(image);
  images$.subscribe((imageData) => {
    image.src = imageData;
  });
})();
