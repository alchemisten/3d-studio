import { FC, useEffect, useRef, useState } from 'react';
import { TranslationsProvider } from 'react-intl-provider';
import { useParams, useSearchParams } from 'react-router-dom';
import { ViewerUI } from '@alchemisten/3d-studio-viewer-ui';
import { ISkyboxFeature, IViewer, SkyboxFeatureToken, ViewerLauncher } from '@alchemisten/3d-studio-viewer-core';
import { Subscription } from 'rxjs';

import { LoadingScreen } from '../../components';
import { translations } from '../../i18n';
import styles from './project.module.scss';

const launcher = new ViewerLauncher();
const config = {
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
              content: 'Hat zwei Achsen und vier Räder',
              headline: 'Unterboden',
            },
            en: {
              content: 'Has two axles and four wheels',
              headline: 'Undercarriage',
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
              content: 'Drehen 90% effektiver als die eckigen Reifen der Konkurrenz',
              headline: 'Runde Reifen',
            },
            en: {
              content: 'Rotating 90% more effective than the square tires of the competition',
              headline: 'Round tires',
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
              content: 'Hier gibts nichts Neues zu sehen, aber sechs Ansichten sind besser als fünf',
              headline: 'Noch eine Ansicht',
            },
            en: {
              content: 'Nothing new to see here, but six views are better than five',
              headline: 'Another view',
            },
          },
          id: 2073,
          pos: {
            x: 0.227234,
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
              content: 'Personengroße Tür für einfaches Be- und Entladen',
              headline: 'Große Seitentür',
            },
            en: {
              content: 'Person-sized door for easy loading and unloading',
              headline: 'Large side door',
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
              content: 'Damit der Kunde nicht noch danach fragen muss',
              headline: 'Maximal großes Logo',
            },
            en: {
              content: 'So that the customer does not have to ask for it',
              headline: 'Maximum sized Logo',
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
            y: 0.5,
            z: 3.41046,
          },
          i18n: {
            de: {
              content: 'Schlimmer als ein SVU. Lässt keine Change zum Abrollen.',
              headline: 'Fahrzeugfront',
            },
            en: {
              content: 'Worse than an SVU. Leaves no chance to roll over.',
              headline: 'Vehicle front',
            },
          },
          id: 2076,
          pos: {
            x: 0,
            y: 0,
            z: 0.4,
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
      skyboxPath: 'assets/textures/environments/blurry',
    },
    WireframeFeature: { enabled: false },
  },
  objects: [
    {
      castShadow: true,
      name: 'Milk-Truck',
      path: 'assets/models/milk-truck-draco/CesiumMilkTruck.gltf',
      receiveShadow: true,
      scale: 0.5,
    },
  ],
  project: {
    basedir: 'http://127.0.0.1:4200',
    folder: 'test123',
    introText: {
      de: {
        intro:
          'Halten Sie die linke Maustaste gedrückt und bewegen Sie den Cursor, um das Modell im Raum zu drehen. Halten Sie die rechte Maustaste gedrückt und bewegen Sie den Cursor, um das Modell im Raum zu verschieben. Mit Hilfe des Mausrads können Sie das Modell näher heranholen oder aus weiterer Entfernung betrachten.Klicken Sie einmalig an beliebiger Stelle um dieses Infofenster zu schließen',
      },
      en: {
        intro:
          'Hold down the left mouse button and move the cursor to rotate the model in space. Hold down the right mouse button and move the cursor to move the model in space. Using the mouse wheel, you can zoom in and out. Click anywhere to close this information.',
      },
    },
    languages: ['de', 'en'],
    name: 'A test project',
    projectID: 'TEST123',
  },
  render: {
    continuousRendering: true,
  },
};

export const Project: FC = () => {
  const { id } = useParams();
  const viewerCanvas = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const [alcmLogo] = useState(searchParams.get('l') === 'true');
  const [isLoading, setIsLoading] = useState(true);
  const [playClicked, setPlayClicked] = useState(searchParams.get('e') !== 'true');
  const [title, setTitle] = useState<string>();
  const [viewer, setViewer] = useState<IViewer>();

  const transparent = searchParams.get('t') === 'true';
  const initialLanguage = searchParams.get('lng');
  const availableLanguages = Object.keys(translations);
  const startLanguage = initialLanguage && availableLanguages.includes(initialLanguage) ? initialLanguage : 'de';

  useEffect(() => {
    if (!viewerCanvas.current) {
      return;
    }

    const allowZoom = searchParams.get('s') !== 'false';
    setViewer(launcher.createHTMLViewer(viewerCanvas.current, { ...config, controls: { allowZoom } }));
  }, [id, searchParams]);

  useEffect(() => {
    if (!viewer) {
      return;
    }

    const subscription = new Subscription();

    subscription.add(
      viewer.assetService.getIsLoading().subscribe((loading) => {
        setIsLoading(loading);
      })
    );

    subscription.add(
      viewer.configService.getConfig().subscribe((config) => {
        setTitle(config.project?.name);
      })
    );

    if (transparent) {
      subscription.add(
        viewer.featureService.getFeatures().subscribe((features) => {
          const skyboxFeature = features.find((feature) => feature.id === SkyboxFeatureToken) as ISkyboxFeature;
          skyboxFeature.setEnabled(false);
        })
      );
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [transparent, viewer]);

  return (
    <>
      <div ref={viewerCanvas} className={`${styles.viewerCanvas} ${!playClicked ? styles.hidden : ''}`} />
      {!playClicked ? (
        // TranslationsProvider is currently only used here because nesting it above the ViewerUI causes a rendering loop
        <TranslationsProvider initialLanguage={startLanguage} initialTranslations={translations}>
          <LoadingScreen
            isLoading={isLoading}
            onPlayClicked={() => setPlayClicked(true)}
            title={title}
            transparent={transparent}
          />
        </TranslationsProvider>
      ) : (
        viewer && (
          <ViewerUI
            viewer={viewer}
            initialLanguage={initialLanguage}
            logo={
              alcmLogo ? (
                <a
                  href="https://alchemisten.ag"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ pointerEvents: 'all' }}
                >
                  <img src="assets/alchemisten-logo.svg" alt="Alchemisten AG Logo" />
                </a>
              ) : undefined
            }
          />
        )
      )}
    </>
  );
};
