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
        highlightsVisible: true,
        highlightSetup: [
          {
            color: '#ffffff',
            scale: 0.19,
            isTrigger: false,
            fov: 40,
            mount: null,
            content: 'hl_1_content',
            speed: {
              fov: 6,
              in: 3,
              out: 6,
            },
            cam: {
              x: 2.68034,
              y: -3.85099,
              z: 2.10968,
            },
            target: {
              x: -2.46729,
              y: 3.68593,
              z: -1.97648,
            },
            nodes: [''],
            delay: 4000,
            pos: {
              x: 0,
              y: -0.219888,
              z: 0,
            },
            style: {
              anchor: 'n',
            },
            id: 2071,
            headline: 'hl_1_title',
          },
          {
            color: '#ffffff',
            scale: 0.19,
            isTrigger: false,
            fov: 40,
            mount: null,
            content: 'hl_2_content',
            speed: {
              fov: 6,
              in: 3,
              out: 6,
            },
            cam: {
              x: 2.28151,
              y: 1.47695,
              z: 1.88254,
            },
            target: {
              x: -3.184,
              y: -4.77317,
              z: -3.69098,
            },
            nodes: [''],
            delay: 4000,
            pos: {
              x: 0.345544,
              y: 0,
              z: 0.245301,
            },
            style: {
              anchor: 'n',
            },
            id: 2072,
            headline: 'hl_2_title',
          },
          {
            color: '#ffffff',
            scale: 0.19,
            isTrigger: false,
            fov: 40,
            mount: null,
            content: 'hl_3_content',
            speed: {
              fov: 6,
              in: 3,
              out: 6,
            },
            cam: {
              x: 1.46705,
              y: 1.50173,
              z: -1.85208,
            },
            target: {
              x: -2.72539,
              y: -4.26271,
              z: 5.1618,
            },
            nodes: [''],
            delay: 4000,
            pos: {
              x: 0.127234,
              y: 0.206625,
              z: -0.202012,
            },
            style: {
              anchor: 'n',
            },
            id: 2073,
            headline: 'hl_3_title',
          },
          {
            color: '#ffffff',
            scale: 0.19,
            isTrigger: false,
            fov: 40,
            mount: null,
            content: 'hl_4_content',
            speed: {
              fov: 6,
              in: 3,
              out: 6,
            },
            cam: {
              x: -1.81269,
              y: 1.29626,
              z: 1.88639,
            },
            target: {
              x: 4.17453,
              y: -2.7536,
              z: -5.02388,
            },
            nodes: [''],
            delay: 4000,
            pos: {
              x: -0.246847,
              y: 0.21732,
              z: 0.156787,
            },
            style: {
              anchor: 'n',
            },
            id: 2074,
            headline: 'hl_4_title',
          },
          {
            color: '#ffffff',
            scale: 0.19,
            isTrigger: false,
            fov: 40,
            mount: null,
            content: 'hl_5_content',
            speed: {
              fov: 6,
              in: 3,
              out: 6,
            },
            cam: {
              x: 2.20833,
              y: -0.26136,
              z: -0.061664,
            },
            target: {
              x: -6.3605,
              y: 4.89373,
              z: -0.0458263,
            },
            nodes: [''],
            delay: 4000,
            pos: {
              x: 0.345273,
              y: 0.0670324,
              z: 0.0150209,
            },
            style: {
              anchor: 'n',
            },
            id: 2075,
            headline: 'hl_5_title',
          },
          {
            color: '#ffffff',
            scale: 0.19,
            isTrigger: false,
            fov: 40,
            mount: null,
            content: 'hl_6_content',
            speed: {
              fov: 6,
              in: 3,
              out: 6,
            },
            cam: {
              x: 0.10648,
              y: -0.0680558,
              z: 3.41046,
            },
            target: {
              x: -0.205522,
              y: 0.131358,
              z: -6.58268,
            },
            nodes: [''],
            delay: 4000,
            pos: {
              x: 0,
              y: 0,
              z: 0.24555,
            },
            style: {
              anchor: 'n',
            },
            id: 2076,
            headline: 'hl_6_title',
          },
        ],
      },
      LightScenarioFeature: {
        enabled: false,
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
                shadowMap: 2048,
                intensity: 1,
                color: '#ffffff',
                position: {
                  x: 5,
                  y: 5,
                  z: 5,
                },
                onlyShadow: false,
                castShadow: true,
                shadowFar: 15,
                type: 'point',
                hasShadow: true,
                shadowNear: 1,
              },
              {
                shadowMap: 0,
                intensity: 0.3,
                color: '#777777',
                position: {
                  x: 0,
                  y: 0,
                  z: 0,
                },
                onlyShadow: false,
                castShadow: false,
                shadowFar: 0,
                type: 'ambient',
                hasShadow: false,
                shadowNear: 0,
              },
            ],
          },
        ],
      },
      WireframeFeature: { enabled: false },
    },
    objects: [
      {
        name: 'Milk-Truck',
        path: 'assets/models/coolbox/COOLBOX--36-412.gltf',
        // scale: 4,
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
