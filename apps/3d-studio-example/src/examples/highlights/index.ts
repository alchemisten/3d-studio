import { ViewerLauncher } from '@alchemisten/3d-studio-viewer-core';

(function () {
  const container = document.getElementById('viewer-container');
  if (!container) {
    return;
  }

  const launcher = new ViewerLauncher();
  launcher.createHTMLViewer(container, {
    features: {
      HighlightFeature: {
        enabled: true,
        groupScale: 8,
        highlightsVisible: true,
        highlightSetup: [
          {
            cam: {
              x: -1.81269,
              y: 1.29626,
              z: 1.88639,
            },
            i18n: {
              de: {
                headline: 'Beifahrertür',
              },
            },
            id: 2074,
            pos: {
              x: -0.246847,
              y: 0.21732,
              z: 0.156787,
            },
            scale: 0.04,
            target: {
              x: 4.17453,
              y: -2.7536,
              z: -5.02388,
            },
          },
          {
            cam: {
              x: 2.20833,
              y: -0.26136,
              z: -0.061664,
            },
            i18n: {
              de: {
                headline: 'Fahrzeugseite',
              },
            },
            id: 2075,
            pos: {
              x: 0.345273,
              y: 0.0670324,
              z: 0.0150209,
            },
            scale: 0.04,
            target: {
              x: -6.3605,
              y: 4.89373,
              z: -0.0458263,
            },
          },
          {
            cam: {
              x: 0.10648,
              y: -0.0680558,
              z: 3.41046,
            },
            i18n: {
              de: {
                headline: 'Unterboden',
              },
            },
            id: 2076,
            pos: {
              x: 0,
              y: 0,
              z: 0.24555,
            },
            scale: 0.04,
            target: {
              x: -0.205522,
              y: 0.131358,
              z: -6.58268,
            },
          },
        ],
      },
    },
    objects: [
      {
        name: 'Milk-Truck',
        path: 'assets/models/milk-truck-draco/CesiumMilkTruck.gltf',
        scale: 0.5,
      },
    ],
    project: {
      basedir: 'http://127.0.0.1:4200',
    },
    render: {
      continuousRendering: true,
    },
  });
})();
