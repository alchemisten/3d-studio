import { BehaviorSubject, Subject, distinctUntilChanged, filter, map, type Observable } from 'rxjs';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Augment to declare events your feature emits:
 * `declare module '@schablone/3d-studio-core' { interface ViewerEventMap { 'my:event': { ... } } }`
 */
export interface ViewerEventMap {
  'model:loaded': { gltf: GLTF };
  'model:error': { error: Error };
}

export type ViewerEventType = keyof ViewerEventMap;

export type ViewerEvent = {
  [K in ViewerEventType]: { type: K; payload: ViewerEventMap[K] };
}[ViewerEventType];

export interface ViewerState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: Error;
  gltf?: GLTF;
  /** On/off state of toggle features by feature id. */
  featureEnabled: Record<string, boolean>;
}

/**
 * Per-viewer state and event bus. Everything is observable so consumers can tap in:
 * `store.select$(s => s.status).subscribe(...)`, `store.on$('model:loaded')`.
 */
export class ViewerStore {
  private readonly stateSubject = new BehaviorSubject<ViewerState>({ status: 'idle', featureEnabled: {} });
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
