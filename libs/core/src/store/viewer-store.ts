import { BehaviorSubject, Subject, distinctUntilChanged, filter, map, type Observable } from 'rxjs';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { initialQualityState, type QualityState, type QualityTier } from '../quality/quality-monitor';

/**
 * Augment to declare events your feature emits:
 * `declare module '@schablone/3d-studio-core' { interface ViewerEventMap { 'my:event': { ... } } }`
 */
export interface ViewerEventMap {
  'model:materials-changed': { gltf: GLTF };
  'model:loaded': { gltf: GLTF };
  /** The model was changed in place (see `ViewerStore.notifyModelChanged`); `fit` asks for the camera to be refitted. */
  'model:changed': { gltf: GLTF; fit: boolean };
  'model:error': { error: Error };
  /** The quality monitor moved to another tier; `fps` is the average that caused it. */
  'quality:tier-changed': { tier: QualityTier; previous: QualityTier; fps?: number };
}

export type ViewerEventType = keyof ViewerEventMap;

export type ViewerEvent = {
  [K in ViewerEventType]: { type: K; payload: ViewerEventMap[K] };
}[ViewerEventType];

export interface ViewerState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: Error;
  gltf?: GLTF;
  /** Counts the in-place changes of the model announced with `notifyModelChanged`; depend on it for what is derived from the model's content. */
  modelRevision: number;
  /** On/off state of toggle features by feature id. */
  featureEnabled: Record<string, boolean>;
  /** Free-form state of features by feature id, e.g. the active light scenario. */
  featureState: Record<string, unknown>;
  /** What the device affords, measured from rendered frames (see `QualityOptions`). Starts at `off`. */
  quality: QualityState;
}

/**
 * Per-viewer state and event bus. Everything is observable so consumers can tap in:
 * `store.select$(s => s.status).subscribe(...)`, `store.on$('model:loaded')`.
 */
export class ViewerStore {
  private readonly stateSubject = new BehaviorSubject<ViewerState>({
    status: 'idle',
    modelRevision: 0,
    featureEnabled: {},
    featureState: {},
    quality: initialQualityState,
  });
  private readonly eventSubject = new Subject<ViewerEvent>();

  public readonly state$: Observable<ViewerState> = this.stateSubject.asObservable();
  public readonly events$: Observable<ViewerEvent> = this.eventSubject.asObservable();

  public subscribe = (listener: () => void): (() => void) => {
    const sub = this.stateSubject.subscribe(listener);
    return () => sub.unsubscribe();
  };

  public getState = (): ViewerState => this.stateSubject.value;

  public setState(patch: Partial<ViewerState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...patch });
  }

  public setFeatureEnabled(id: string, enabled: boolean): void {
    if (this.getState().featureEnabled[id] !== enabled) {
      this.setState({ featureEnabled: { ...this.getState().featureEnabled, [id]: enabled } });
    }
  }

  public setFeatureState(id: string, value: unknown): void {
    this.setState({ featureState: { ...this.getState().featureState, [id]: value } });
  }

  /**
   * Tells the viewer that the shown model was changed in place: nodes added, removed, moved, hidden or given
   * other materials. Bounds, floor, shadows, outlines and material effects are derived again and a frame is
   * drawn. The camera stays where it is unless `fit` is set.
   */
  public notifyModelChanged({ fit = false }: { fit?: boolean } = {}): void {
    const { gltf, modelRevision } = this.getState();
    if (!gltf) return;
    this.setState({ modelRevision: modelRevision + 1 });
    this.emit('model:changed', { gltf, fit });
    this.emit('model:materials-changed', { gltf });
  }

  public select$<T>(selector: (state: ViewerState) => T): Observable<T> {
    return this.stateSubject.pipe(map(selector), distinctUntilChanged());
  }

  public emit<K extends ViewerEventType>(type: K, payload: ViewerEventMap[K]): void {
    this.eventSubject.next({ type, payload } as ViewerEvent);
  }

  public on$<K extends ViewerEventType>(type: K): Observable<ViewerEventMap[K]> {
    return this.eventSubject.pipe(
      filter((e): e is Extract<ViewerEvent, { type: K }> => e.type === type),
      map((e) => e.payload as ViewerEventMap[K]),
    );
  }

  public dispose(): void {
    this.eventSubject.complete();
    this.stateSubject.complete();
  }
}
