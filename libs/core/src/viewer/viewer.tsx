import { Suspense, useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
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
import { FeatureReactContext, useFeatures, type FeatureInput } from '../feature';
import { ViewerContext, ViewerStore, useViewer, useViewerState } from '../store';
import { ViewerErrorBoundary } from './error-boundary';
import { DefaultControls, Model } from './model';
import './viewer.css';

declare module '@schablone/3d-studio-ui' {
  interface SlotMap {
    'viewer.loading': Record<string, never>;
    'viewer.error': { error: Error | undefined };
    /** Rows of the 'View options' menu; toggle features add `MenuCheckboxItem`s here. */
    'viewer.options': Record<string, never>;
  }
}

export interface ViewerProps {
  /** URL of the glTF/GLB to display. */
  source: string;
  features?: FeatureInput[];
  /** Per-feature config by feature id, e.g. from a data adapter. Overrides glTF-embedded config. */
  featureConfig?: Record<string, unknown>;
  theme?: Theme;
  /** Static slot fills (SSR-safe). */
  slots?: SlotFillsInput;
  /** Bring your own store to tap into state and events from outside. */
  store?: ViewerStore;
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
  /** Where the shared 'View options' menu is placed (default top-right), or `false` to hide it. */
  viewOptions?: { region?: OverlayRegion; order?: number; label?: string } | false;
  /** Overlay items, e.g. `<Overlay.TopRight>...</Overlay.TopRight>`. */
  children?: ReactNode;
}

const ViewerError = () => {
  const error = useViewerState((s) => s.error);
  return (
    <div className="ds-viewer__message" role="alert">
      <Slot name="viewer.error" props={{ error }}>
        {error?.message ?? 'Something went wrong while loading the model.'}
      </Slot>
    </div>
  );
};

const ViewOptions = ({ region = 'top-right', order = 100, label = 'View options' }: { region?: OverlayRegion; order?: number; label?: string }) => {
  const hasItems = useSlotFills('viewer.options').length > 0;
  const Region = REGION_COMPONENTS[region];
  return hasItems ? (
    <Region id="viewer.options" order={order}>
      <Menu label={label} icon="⚙" placement={region.endsWith('right') ? 'bottom-end' : 'bottom-start'}>
        <Slot name="viewer.options" />
      </Menu>
    </Region>
  ) : null;
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
} satisfies Record<OverlayRegion, unknown>;

const ViewerLayout = ({
  source,
  features,
  featureConfig,
  canvas,
  draco,
  controls,
  canvasChildren,
  viewOptions,
  className,
  style,
  children,
}: Omit<ViewerProps, 'theme' | 'slots' | 'store'>) => {
  const status = useViewerState((s) => s.status);
  const resolved = useFeatures(features, featureConfig);
  const store = useViewer();

  useEffect(() => {
    store.setState({ status: 'loading', error: undefined, gltf: undefined });
  }, [source, store]);

  return (
    <div className={['ds-viewer', className].filter(Boolean).join(' ')} style={style}>
      <ViewerErrorBoundary
        fallback={<ViewerError />}
        onError={(error) => {
          store.setState({ status: 'error', error });
          store.emit('model:error', { error });
        }}
      >
        <Canvas {...canvas}>
          <ViewerContext.Provider value={store}>
            <Suspense fallback={null}>
              <Model url={source} draco={draco} />
            </Suspense>
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
          </ViewerContext.Provider>
        </Canvas>
      </ViewerErrorBoundary>
      <Overlay>
        {children}
        {viewOptions !== false && <ViewOptions {...viewOptions} />}
      </Overlay>
      {(status === 'idle' || status === 'loading') && (
        <div className="ds-viewer__message">
          <Slot name="viewer.loading">Loading…</Slot>
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
