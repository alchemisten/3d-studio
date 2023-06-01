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
      HighlightFeature: {
        enabled: true,
        groupScale: 4,
        highlightsVisible: true,
        highlightSetup: [
          {
            cam: {
              x: 2.68034,
              y: -3.85099,
              z: 2.10968,
            },
            i18n: {
              de: {
                content: '',
                headline: 'rundum geschlossen',
              },
            },
            id: 2071,
            pos: {
              x: 0,
              y: -0.219888,
              z: 0,
            },
            scale: 0.04,
            target: {
              x: -2.46729,
              y: 3.68593,
              z: -1.97648,
            },
          },
          {
            cam: {
              x: 2.28151,
              y: 1.47695,
              z: 1.88254,
            },
            i18n: {
              de: {
                content:
                  'erleichtert die Reinigung und ist dank der Herstellung aus unbedenklichen Materialien geeignet für den Kontakt mit Lebensmitteln.',
                headline: 'porenlose Oberfläche mit gerundeten Ecken',
              },
            },
            id: 2072,
            pos: {
              x: 0.345544,
              y: 0,
              z: 0.245301,
            },
            scale: 0.04,
            target: {
              x: -3.184,
              y: -4.77317,
              z: -3.69098,
            },
          },
          {
            cam: {
              x: 1.46705,
              y: 1.50173,
              z: -1.85208,
            },
            i18n: {
              de: {
                content: 'hält die Kühlkette beim Transport aufrecht und kühlt während 12h',
                headline: 'Innenisolation',
              },
            },
            id: 2073,
            pos: {
              x: 0.127234,
              y: 0.206625,
              z: -0.202012,
            },
            scale: 0.04,
            target: {
              x: -2.72539,
              y: -4.26271,
              z: 5.1618,
            },
          },
          {
            cam: {
              x: -1.81269,
              y: 1.29626,
              z: 1.88639,
            },
            i18n: {
              de: {
                content: 'kompatibel mit allen ISO und SGL Normen',
                headline: 'Stülpdeckel - stapelbar',
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
                content: '',
                headline: '2 Muschelgriffe',
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
                content: '',
                headline: 'Beschriftungs- und Identifikationsfläche',
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
      LightScenarioFeature: {
        enabled: true,
        initialScenarioId: 'performance',
        scenarios: [
          {
            i18n: {
              de: {
                name: 'High Performance Lichter',
              },
            },
            id: 'performance',
            lights: {},
            lightSetups: [
              {
                castShadow: true,
                color: '#ffffff',
                intensity: 1,
                name: 'PointLight',
                position: {
                  x: 5,
                  y: 5,
                  z: 5,
                },
                shadow: {
                  camera: {
                    far: 30,
                    near: 1,
                  },
                  mapSize: {
                    height: 2048,
                    width: 2048,
                  },
                  normalBias: 0.005,
                },
                type: 'point',
              },
              {
                intensity: 0.3,
                color: '#777777',
                name: 'AmbientLight',
                type: 'ambient',
              },
            ],
          },
        ],
      },
      SkyboxFeature: {
        enabled: true,
        skyboxPath: 'blurry',
      },
      WireframeFeature: { enabled: false },
    },
    objects: [
      {
        castShadow: true,
        name: 'Milk-Truck',
        path: 'assets/models/coolbox/COOLBOX--36-412.gltf',
        receiveShadow: true,
        scale: 4,
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
      continuousRendering: true,
    },
  });
})();
