import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations } from '@react-three/drei';
import { LoopOnce, LoopPingPong, LoopRepeat } from 'three';
import {
  defineFeature,
  useFeature,
  useFeatureEnabled,
  useViewer,
  useViewerState,
  type ViewerStore,
} from '@schablone/3d-studio-core';
import './animation.css';
import { IconButton, Slot, type OverlayRegion } from '@schablone/3d-studio-ui';

declare module '@schablone/3d-studio-ui' {
  interface SlotMap {
    /** Default animation controls (play/pause and scrubber). Replace to bring your own UI. */
    'animation.controls': Record<string, never>;
  }
}

declare module '@schablone/3d-studio-core' {
  interface ViewerEventMap {
    /** Request from other features (e.g. highlights) to jump the timeline. */
    /** Command: jump the timeline. */
    'animation:seek': { time: number };
    /** Commands: without a clip, they apply to all clips. */
    'animation:play': { clip?: string };
    'animation:pause': { clip?: string };
    'animation:stop': { clip?: string };
    /** Notification: playback crossed a cue (also fires for cues wrapped by a loop). */
    'animation:cue': { id: string; time: number };
  }
}

export interface AnimationConfig {
  /** Initial state of the toggle; `false` pauses all animations. */
  enabled: boolean;
  /** Clip names started on load. */
  autoplay: string[] | 'all' | 'none';
  loop: 'repeat' | 'once' | 'pingpong';
  /** Mixer time scale. */
  speed: number;
  /** Show the default controls in the overlay (bottom-center unless a region is given). */
  controls: boolean | { region?: OverlayRegion };
  /** Named points on the timeline. Crossing one while playing emits `animation:cue`. */
  cues: AnimationCue[];
}

export interface AnimationCue {
  id: string;
  /** Seconds. */
  time: number;
}

/** Cues passed when moving from `prev` to `next`; a backwards step is treated as a loop wrap. */
export const crossedCues = (cues: AnimationCue[], prev: number, next: number, duration: number): AnimationCue[] => {
  if (next === prev) {
    return [];
  }
  if (next > prev) {
    return cues.filter((c) => c.time > prev && c.time <= next);
  }
  return cues.filter((c) => c.time > prev && c.time <= duration).concat(cues.filter((c) => c.time >= 0 && c.time <= next));
};

export type ClipStatus = 'playing' | 'paused' | 'stopped';

export interface AnimationState {
  clips: string[];
  status: Record<string, ClipStatus>;
  /** Time of the first playing or paused clip, in seconds. */
  time: number;
  /** Longest clip, in seconds. */
  duration: number;
  seekRequest?: { time: number; n: number };
}

const FEATURE_ID = 'animation';
const EMPTY: AnimationState = { clips: [], status: {}, time: 0, duration: 0 };

export interface AnimationApi extends AnimationState {
  /** Without a name, applies to all clips. */
  play: (name?: string) => void;
  pause: (name?: string) => void;
  stop: (name?: string) => void;
  seek: (time: number) => void;
}

/** Animation state and commands, usable in the DOM tree and in the scene. */
export const useAnimation = (): AnimationApi => {
  const viewer = useViewer();
  const state = useViewerState((s) => (s.featureState[FEATURE_ID] as AnimationState | undefined) ?? EMPTY);
  const update = (patch: (s: AnimationState) => Partial<AnimationState>) => {
    const current = (viewer.getState().featureState[FEATURE_ID] as AnimationState | undefined) ?? EMPTY;
    viewer.setFeatureState(FEATURE_ID, { ...current, ...patch(current) });
  };
  const setStatus = (status: ClipStatus) => (name?: string) => update((s) => statusPatch(s, status, name));
  return {
    ...state,
    play: setStatus('playing'),
    pause: setStatus('paused'),
    stop: setStatus('stopped'),
    seek: (time) => update((s) => ({ seekRequest: { time, n: (s.seekRequest?.n ?? 0) + 1 } })),
  };
};

const statusPatch = (s: AnimationState, status: ClipStatus, name?: string): Partial<AnimationState> => ({
  status: Object.fromEntries(s.clips.map((c) => [c, !name || c === name ? status : (s.status[c] ?? 'stopped')])),
});

const currentState = (viewer: ViewerStore) =>
  (viewer.getState().featureState[FEATURE_ID] as AnimationState | undefined) ?? EMPTY;

/** Runs `handler` when playback crosses the cue with the given id (or any cue for `'*'`). */
export const useAnimationCue = (id: string, handler: (cue: { id: string; time: number }) => void) => {
  const viewer = useViewer();
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    const sub = viewer.on$('animation:cue').subscribe((cue) => (id === '*' || cue.id === id) && latest.current(cue));
    return () => sub.unsubscribe();
  }, [viewer, id]);
};

const LOOP = { repeat: LoopRepeat, once: LoopOnce, pingpong: LoopPingPong } as const;

const AnimationScene = () => {
  const { config, viewer } = useFeature<AnimationConfig>();
  const enabled = useFeatureEnabled();
  const gltf = useViewerState((s) => s.gltf);
  const state = useViewerState((s) => (s.featureState[FEATURE_ID] as AnimationState | undefined) ?? EMPTY);
  const { actions, mixer } = useAnimations(gltf?.animations ?? [], gltf?.scene);
  const lastTime = useRef(0);
  const lastCueTime = useRef(0);

  const patch = (next: Partial<AnimationState>) =>
    viewer.setFeatureState(FEATURE_ID, {
      ...((viewer.getState().featureState[FEATURE_ID] as AnimationState | undefined) ?? EMPTY),
      ...next,
    });

  useEffect(() => {
    const clips = gltf?.animations ?? [];
    const names = clips.map((c) => c.name);
    const start = config.autoplay === 'all' ? names : config.autoplay === 'none' ? [] : config.autoplay;
    patch({
      clips: names,
      duration: Math.max(0, ...clips.map((c) => c.duration)),
      status: Object.fromEntries(names.map((n) => [n, start.includes(n) ? 'playing' : 'stopped'])),
      time: 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf, config.autoplay]);

  useEffect(() => {
    mixer.timeScale = config.speed;
  }, [mixer, config.speed]);

  useEffect(() => {
    Object.entries(actions).forEach(([name, action]) => {
      if (!action) {
        return;
      }
      const status = state.status[name] ?? 'stopped';
      if (status === 'stopped') {
        action.stop();
        return;
      }
      action.setLoop(LOOP[config.loop], Infinity);
      action.clampWhenFinished = config.loop === 'once';
      action.paused = status === 'paused' || !enabled;
      action.play();
    });
  }, [actions, state.status, enabled, config.loop]);

  useEffect(() => {
    if (state.seekRequest) {
      Object.values(actions).forEach((action) => action && (action.time = state.seekRequest?.time ?? 0));
      lastCueTime.current = state.seekRequest.time;
      mixer.update(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.seekRequest?.n]);

  useFrame(() => {
    const active = Object.entries(actions).find(([name, a]) => a && (state.status[name] ?? 'stopped') !== 'stopped');
    const time = active?.[1]?.time ?? 0;
    if (config.cues.length && time !== lastCueTime.current) {
      const duration = viewer.getState().featureState[FEATURE_ID] ? currentState(viewer).duration : 0;
      const playing = Object.values(state.status).includes('playing') && enabled;
      if (playing) {
        crossedCues(config.cues, lastCueTime.current, time, duration).forEach((cue) =>
          viewer.emit('animation:cue', { id: cue.id, time: cue.time }),
        );
      }
      lastCueTime.current = time;
    }
    if (Math.abs(time - lastTime.current) > 0.05) {
      lastTime.current = time;
      patch({ time });
    }
  });

  return null;
};

const Controls = () => {
  const { clips, status, time, duration, play, pause, seek } = useAnimation();
  if (!clips.length) {
    return null;
  }
  const playing = clips.some((c) => status[c] === 'playing');
  return (
    <Slot name="animation.controls">
      <div className="ds-animation-controls" data-playing={playing ? '' : undefined} data-testid="ds-animation-controls">
        <IconButton
          label={playing ? 'Pause' : 'Play'}
          className="ds-animation-controls__play"
          data-testid="ds-animation-play"
          icon={<span aria-hidden="true">{playing ? '⏸' : '▶'}</span>}
          onClick={() => (playing ? pause() : play())}
        />
        <input
          type="range"
          aria-label="Animation time"
          className="ds-animation-controls__scrubber"
          data-testid="ds-animation-scrubber"
          min={0}
          max={duration}
          step={0.01}
          value={Math.min(time, duration)}
          onChange={(e) => seek(Number(e.target.value))}
        />
      </div>
    </Slot>
  );
};

/** glTF extension: `ALCM_animation`. Usage: `animation.use({ autoplay: 'all', loop: 'pingpong' })` */
export const animation = defineFeature<AnimationConfig>({
  id: FEATURE_ID,
  defaults: { enabled: true, autoplay: 'all', loop: 'repeat', speed: 1, controls: true, cues: [] },
  gltf: { extension: 'ALCM_animation' },
  toggle: { label: 'Animations' },
  scene: AnimationScene,
  setup: ({ viewer }) => {
    const apply = (patch: (s: AnimationState) => Partial<AnimationState>) => {
      const current = currentState(viewer);
      viewer.setFeatureState(FEATURE_ID, { ...current, ...patch(current) });
    };
    const subs = [
      viewer.on$('animation:seek').subscribe(({ time }) =>
        apply((s) => ({ seekRequest: { time, n: (s.seekRequest?.n ?? 0) + 1 } })),
      ),
      viewer.on$('animation:play').subscribe(({ clip }) => apply((s) => statusPatch(s, 'playing', clip))),
      viewer.on$('animation:pause').subscribe(({ clip }) => apply((s) => statusPatch(s, 'paused', clip))),
      viewer.on$('animation:stop').subscribe(({ clip }) => apply((s) => statusPatch(s, 'stopped', clip))),
    ];
    return () => subs.forEach((sub) => sub.unsubscribe());
  },
  slots: ({ config }) => {
    if (!config.controls) {
      return {};
    }
    const region = typeof config.controls === 'object' ? (config.controls.region ?? 'bottom-center') : 'bottom-center';
    return { [`overlay.${region}`]: { mode: 'append', order: 0, content: <Controls /> } };
  },
});
