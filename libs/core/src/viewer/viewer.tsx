import { Suspense, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { ImageDown, Palette, Settings } from 'lucide-react';
import { useGLTF } from '@react-three/drei';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import {
  Button,
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
import {
  indexModelTools,
  ModelToolContext,
  ModelToolControls,
  useModelTools,
  FeatureReactContext,
  useFeatures,
  type FeatureInput,
} from '../feature';
import { type ViewerQuery, ViewerContext, ViewerStore, useViewer, useViewerState } from '../store';
import { type QualityOptions, QualityWatcher } from '../quality';
import { ViewerErrorBoundary } from './error-boundary';
import type { OpeningCamera } from './opening-view';
import { FirstSceneFrame } from './first-scene-frame';
import { SceneLoading, type SceneLoadingProps } from './scene-loading';
import { DefaultControls, HostModel, Model, type ViewerModel } from './model';
import { resolveViewerLabels, type ViewerLabels } from './viewer-labels';
import './viewer.css';

declare module '@schablone/3d-studio-ui' {
  interface SlotMap {
    'viewer.loading': Record<string, never>;
    'viewer.error': { error: Error | undefined; retry?: () => void };
    /** Rows of the 'View options' menu; toggle features add `MenuCheckboxItem`s here. */
    'model.tools': Record<string, never>;
    'viewer.output': Record<string, never>;
    'viewer.options': Record<string, never>;
    /** Full-size DOM layer between canvas and overlay, e.g. for hotspots positioned from the scene. Children opt into pointer events. */
    'viewer.layer': Record<string, never>;
  }
}

export interface ViewerSourceProps {
  /** URL of the glTF/GLB to display. */
  source: string;
  model?: never;
}

export interface ViewerModelProps {
  /**
   * A scene the host built and owns, shown instead of a loaded `source`. It is neither cloned nor disposed
   * and there is no loading state. After changing it in place call `store.notifyModelChanged()`.
   */
  model: ViewerModel;
  source?: never;
}

export interface ViewerOptions {
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
  /** Thresholds of the quality monitor behind `quality.tier` of the store, a fixed `tier`, or `false` to keep it `off`. */
  quality?: QualityOptions | false;
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
  /** Locale of the viewer's own chrome (menu names, retry); `en` and `de` are shipped. */
  locale?: string;
  /** Overrides single texts of the viewer's chrome. */
  labels?: Partial<ViewerLabels>;
  /** Where the shared 'View options' menu is placed (default bottom-right), or `false` to hide it. */
  modelTools?: { tools?: readonly string[]; region?: OverlayRegion; order?: number; label?: string } | false;
  outputMenu?: { region?: OverlayRegion; order?: number; label?: string } | false;
  viewOptions?: { region?: OverlayRegion; order?: number; label?: string } | false;
  /** Overlay items, e.g. `<Overlay.TopRight>...</Overlay.TopRight>`. */
  children?: ReactNode;
}

export type ViewerProps = ViewerOptions & (ViewerSourceProps | ViewerModelProps);

const ViewerError = ({ retry, labels }: { retry: () => void; labels: ViewerLabels }) => {
  const error = useViewerState((s) => s.error);
  return (
    <div className="ds-viewer__message ds-viewer__message--error" role="alert" data-testid="ds-viewer-error">
      <Slot name="viewer.error" props={{ error, retry }}>
        <span>{error?.message ?? labels.loadError}</span>
        <Button onClick={retry}>{labels.retry}</Button>
      </Slot>
    </div>
  );
};

interface ToolMenuProps {
  slot: 'model.tools' | 'viewer.options' | 'viewer.output';
  tools?: readonly string[];
  region: OverlayRegion;
  label: string;
  order?: number;
}

const ToolMenu = ({ slot, region, label, tools, order = 100 }: ToolMenuProps) => {
  const hasItems = useSlotFills(slot).length > 0;
  const Region = REGION_COMPONENTS[region];
  const isSettings = slot === 'viewer.options';
  const isOutput = slot === 'viewer.output';
  const available = useModelTools(slot === 'model.tools' ? tools : []);
  if (!hasItems && !available.length) return null;
  return (
    <Region id={slot} order={order}>
      <Menu
        label={label}
        icon={isOutput ? <ImageDown size={20} /> : isSettings ? <Settings size={20} /> : <Palette size={20} />}
        className={isOutput ? 'ds-output' : isSettings ? 'ds-view-options' : 'ds-model-tools'}
        testId={isOutput ? 'ds-output' : isSettings ? 'ds-view-options' : 'ds-model-tools'}
        placement={`${region.startsWith('bottom') ? 'top' : 'bottom'}-${region.endsWith('right') ? 'end' : 'start'}`}
      >
        <Slot name={slot}>
          <ModelToolControls tools={available} surface="menu" />
        </Slot>
      </Menu>
    </Region>
  );
};

const FIXED_OFF: QualityOptions = { tier: 'off' };

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
  model: hostModel,
  query,
  features,
  featureConfig,
  quality,
  canvas,
  draco,
  openingCamera,
  loadingPreview,
  controls = true,
  canvasChildren,
  viewOptions,
  modelTools,
  outputMenu,
  className,
  style,
  locale,
  labels: labelOverrides,
  children,
}: Omit<ViewerOptions, 'theme' | 'slots' | 'store'> & (ViewerSourceProps | ViewerModelProps)) => {
  const labels = useMemo(() => resolveViewerLabels(locale, labelOverrides), [locale, labelOverrides]);
  const status = useViewerState((s) => s.status);
  const model = useViewerState((s) => s.gltf);
  const [attempt, setAttempt] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const resolved = useFeatures(features, featureConfig, query);
  const registered = useMemo(
    () =>
      model
        ? indexModelTools(resolved.flatMap(({ instance, context }) => instance.feature.tools?.(context) ?? []))
        : null,
    [model, resolved],
  );
  const store = useViewer();

  useEffect(() => {
    if (source === undefined) return;
    setDismissed(false);
    store.setState({ status: 'loading', error: undefined, gltf: undefined });
  }, [source, store]);

  const retry = () => {
    if (source !== undefined) useGLTF.clear(source);
    store.setState({ status: source === undefined ? 'idle' : 'loading', error: undefined, gltf: undefined });
    setDismissed(false);
    setAttempt((previous) => previous + 1);
  };

  return (
    <div
      className={['ds-viewer', className].filter(Boolean).join(' ')}
      style={style}
      data-status={status}
      data-testid="ds-viewer"
    >
      <ViewerErrorBoundary
        key={JSON.stringify([source, attempt])}
        fallback={<ViewerError retry={retry} labels={labels} />}
        onError={(error) => {
          store.setState({ status: 'error', error });
          store.emit('model:error', { error });
        }}
      >
        <Canvas
          {...canvas}
          className={['ds-viewer__canvas', canvas?.className].filter(Boolean).join(' ')}
          data-testid="ds-viewer-canvas"
        >
          <ViewerContext.Provider value={store}>
            <QualityWatcher options={quality === false ? FIXED_OFF : quality} />
            <Suspense fallback={null}>
              {hostModel ? (
                <HostModel model={hostModel} openingCamera={openingCamera} />
              ) : (
                <Model waitForSceneFrame openingCamera={openingCamera} url={source} draco={draco} />
              )}
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
              {model && !hostModel && <FirstSceneFrame model={model} />}
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
          {modelTools !== false && (
            <ToolMenu slot="model.tools" region="middle-left" label={labels.customize} {...modelTools} />
          )}
          {outputMenu !== false && (
            <ToolMenu slot="viewer.output" region="top-right" label={labels.output} {...outputMenu} />
          )}
          {viewOptions !== false && (
            <ToolMenu slot="viewer.options" region="bottom-right" label={labels.viewOptions} {...viewOptions} />
          )}
        </Overlay>
      </ModelToolContext.Provider>
      {!hostModel && status !== 'error' && (!dismissed || status !== 'ready') && (
        <div
          className="ds-viewer__message ds-viewer__message--loading"
          data-testid="ds-viewer-loading"
          data-leaving={status === 'ready' || undefined}
          onAnimationEnd={(event) => {
            if (status === 'ready' && event.target === event.currentTarget) setDismissed(true);
          }}
        >
          <Slot name="viewer.loading">
            <SceneLoading {...loadingPreview} />
          </Slot>
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
