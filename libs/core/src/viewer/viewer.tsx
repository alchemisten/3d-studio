import { Suspense, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Palette, Settings } from 'lucide-react';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import {
  Menu,
  Overlay,
  Slot,
  useSlotFills,
  type OverlayRegion,
  SlotProvider,
  ThemeProvider,
  type SlotFillsInput,
  type Theme,
} from '@schablone/3d-studio-ui';
import { indexModelTools, ModelToolContext, ModelToolControls, useModelTools, FeatureReactContext, useFeatures, type FeatureInput } from '../feature';
import { type ViewerQuery, ViewerContext, ViewerStore, useViewer, useViewerState } from '../store';
import { ViewerErrorBoundary } from './error-boundary';
import type { OpeningCamera } from './opening-view';
import { FirstSceneFrame } from './first-scene-frame';
import { SceneLoading, type SceneLoadingProps } from './scene-loading';
import { DefaultControls, Model } from './model';
import './viewer.css';

declare module '@schablone/3d-studio-ui' {
  interface SlotMap {
    'viewer.loading': Record<string, never>;
    'viewer.error': { error: Error | undefined };
    /** Rows of the 'View options' menu; toggle features add `MenuCheckboxItem`s here. */
    'model.tools': Record<string, never>;
    'viewer.options': Record<string, never>;
    /** Full-size DOM layer between canvas and overlay, e.g. for hotspots positioned from the scene. Children opt into pointer events. */
    'viewer.layer': Record<string, never>;
  }
}

export interface ViewerProps {
  /** URL of the glTF/GLB to display. */
  source: string;
  loadingPreview?: SceneLoadingProps;
  openingCamera?: OpeningCamera;
  features?: FeatureInput[];
  /** Per-feature config by feature id, e.g. from a data adapter. Overrides glTF-embedded config. */
  featureConfig?: Record<string, unknown>;
  theme?: Theme;
  /** Static slot fills (SSR-safe). */
  slots?: SlotFillsInput;
  /** Bring your own store to tap into state and events from outside. */
  store?: ViewerStore;
  query?: ViewerQuery;
  /** Passed to the R3F `<Canvas>`. */
  canvas?: Omit<CanvasProps, 'children'>;
  /** Draco decoder path, `true` for drei's default, `false` to disable. */
  draco?: string | boolean;
  /** `false` to remove the default orbit controls and bring your own as `canvasChildren`. */
  controls?: boolean;
  /** Extra R3F elements rendered inside the canvas (lights, environment, helpers). */
  canvasChildren?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Where the shared 'View options' menu is placed (default bottom-right), or `false` to hide it. */
  modelTools?: { tools?: readonly string[]; region?: OverlayRegion; order?: number; label?: string } | false;
  viewOptions?: { region?: OverlayRegion; order?: number; label?: string } | false;
  /** Overlay items, e.g. `<Overlay.TopRight>...</Overlay.TopRight>`. */
  children?: ReactNode;
}

const ViewerError = () => {
  const error = useViewerState((s) => s.error);
  return (
    <div className="ds-viewer__message ds-viewer__message--error" role="alert" data-testid="ds-viewer-error">
      <Slot name="viewer.error" props={{ error }}>
        {error?.message ?? 'Something went wrong while loading the model.'}
      </Slot>
    </div>
  );
};

interface ToolMenuProps {
  slot: 'model.tools' | 'viewer.options';
  tools?: readonly string[];
  region: OverlayRegion;
  label: string;
  order?: number;
}

const ToolMenu = ({ slot, region, label, tools, order = 100 }: ToolMenuProps) => {
  const hasItems = useSlotFills(slot).length > 0;
  const Region = REGION_COMPONENTS[region];
  const isSettings = slot === 'viewer.options';
  const available = useModelTools(isSettings ? [] : tools);
  if (!hasItems && !available.length) return null;
  return (
    <Region id={slot} order={order}>
      <Menu label={label} icon={isSettings ? <Settings size={20} /> : <Palette size={20} />}
        className={isSettings ? 'ds-view-options' : 'ds-model-tools'}
        testId={isSettings ? 'ds-view-options' : 'ds-model-tools'}
        placement={`${region.startsWith('bottom') ? 'top' : 'bottom'}-${region.endsWith('right') ? 'end' : 'start'}`}>
        <Slot name={slot}><ModelToolControls tools={available} surface="menu" /></Slot>
      </Menu>
    </Region>
  );
};

const REGION_COMPONENTS = {
  'top-left': Overlay.TopLeft,
  'top-center': Overlay.TopCenter,
  'top-right': Overlay.TopRight,
  'middle-left': Overlay.MiddleLeft,
  center: Overlay.Center,
  'middle-right': Overlay.MiddleRight,
  'bottom-left': Overlay.BottomLeft,
  'bottom-center': Overlay.BottomCenter,
  'bottom-right': Overlay.BottomRight,
  'bottom-bar': Overlay.BottomBar,
} satisfies Record<OverlayRegion, unknown>;

const ViewerLayout = ({
  source,
  query,
  features,
  featureConfig,
  canvas,
  draco,
  openingCamera,
  loadingPreview,
  controls = true,
  canvasChildren,
  viewOptions,
  modelTools,
  className,
  style,
  children,
}: Omit<ViewerProps, 'theme' | 'slots' | 'store'>) => {
  const status = useViewerState((s) => s.status);
  const model = useViewerState((s) => s.gltf);
  const [dismissed, setDismissed] = useState(false);
  const resolved = useFeatures(features, featureConfig, query);
  const registered = useMemo(() => model ? indexModelTools(resolved.flatMap(({ instance, context }) => instance.feature.tools?.(context) ?? [])) : null, [model, resolved]);
  const store = useViewer();

  useEffect(() => {
    setDismissed(false);
    store.setState({ status: 'loading', error: undefined, gltf: undefined });
  }, [source, store]);

  return (
    <div className={['ds-viewer', className].filter(Boolean).join(' ')} style={style} data-status={status} data-testid="ds-viewer">
      <ViewerErrorBoundary key={source}
        fallback={<ViewerError />}
        onError={(error) => {
          store.setState({ status: 'error', error });
          store.emit('model:error', { error });
        }}
      >
        <Canvas {...canvas} className={['ds-viewer__canvas', canvas?.className].filter(Boolean).join(' ')} data-testid="ds-viewer-canvas">
          <ViewerContext.Provider value={store}>
            <Suspense fallback={null}>
              <Model waitForSceneFrame openingCamera={openingCamera} url={source} draco={draco} />
              {controls && <DefaultControls />}
              {canvasChildren}
              {resolved.map(({ id, instance, context }) => {
                const Scene = instance.feature.scene;
                return Scene ? (
                  <FeatureReactContext.Provider key={id} value={context}>
                    <Scene />
                  </FeatureReactContext.Provider>
                ) : null;
              })}
              {model && <FirstSceneFrame model={model} />}
            </Suspense>
          </ViewerContext.Provider>
        </Canvas>
      </ViewerErrorBoundary>
      <div className="ds-viewer__layer" data-testid="ds-viewer-layer">
        <Slot name="viewer.layer" />
      </div>
      <ModelToolContext.Provider value={registered}>
        <Overlay>
          {children}
          {modelTools !== false && <ToolMenu slot="model.tools" region="middle-left" label="Customize" {...modelTools} />}
          {viewOptions !== false && <ToolMenu slot="viewer.options" region="bottom-right" label="View options" {...viewOptions} />}
        </Overlay>
      </ModelToolContext.Provider>
      {status !== 'error' && (!dismissed || status !== 'ready') && (
        <div className="ds-viewer__message ds-viewer__message--loading" data-testid="ds-viewer-loading"
          data-leaving={status === 'ready' || undefined}
          onAnimationEnd={(event) => {
            if (status === 'ready' && event.target === event.currentTarget) setDismissed(true);
          }}>
          <Slot name="viewer.loading"><SceneLoading {...loadingPreview} /></Slot>
        </div>
      )}
    </div>
  );
};

/**
 * Batteries-included viewer: canvas, model loading, orbit controls, features,
 * slots, overlay and theming. Pass `store` to observe it from outside.
 */
export const Viewer = ({ theme, slots, store, ...rest }: ViewerProps) => {
  const ownStore = useMemo(() => store ?? new ViewerStore(), [store]);
  return (
    <ThemeProvider theme={theme} className="ds-viewer-theme">
      <SlotProvider slots={slots}>
        <ViewerContext.Provider value={ownStore}>
          <ViewerLayout {...rest} />
        </ViewerContext.Provider>
      </SlotProvider>
    </ThemeProvider>
  );
};
