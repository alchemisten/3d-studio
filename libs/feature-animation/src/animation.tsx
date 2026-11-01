import { useEffect, useRef } from 'react';
import { Pause, Play } from 'lucide-react';
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
    /** Full-width timeline scrubber. */
    'animation.scrubber': Record<string, never>;
  }
}

declare module '@schablone/3d-studio-core' {
  interface ViewerEventMap {
    /** Request from other features (e.g. highlights) to jump the timeline. */
    /** Command: jump the timeline. */
    'animation:seek': { time: number; clip?: string };
    /** Commands: without a clip, they apply to all clips. */
    'animation:play': { clip?: string };
    'animation:pause': { clip?: string };
    'animation:stop': { clip?: string };
    /** Notification: playback crossed a cue (also fires for cues wrapped by a loop). */
    'animation:cue': { id: string; time: number; clip?: string };
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
  /** Show the default controls in the overlay (bottom-left unless a region is given; the scrubber spans the bottom bar). */
  controls: boolean | { region?: OverlayRegion };
  /** Named points on the timeline. Crossing one while playing emits `animation:cue`. */
  cues: AnimationCue[];
  /** Per-clip overrides by clip name; unset fields fall back to the global values. */
  clips: Record<string, ClipConfig>;
}

export interface ClipConfig {
  /** Overrides the global `autoplay` list for this clip. */
  autoplay?: boolean;
  loop?: 'repeat' | 'once' | 'pingpong';
  /** Multiplied with the global `speed`. */
  speed?: number;
  /** Shown in the clip toggles. Defaults to the clip name. */
  label?: string;
  /** Leave the clip out of the default clip toggles. */
  hidden?: boolean;
}

export interface AnimationCue {
  id: string;
  /** Seconds. */
  time: number;
  /** Follow this clip's time. Defaults to the reference clip (first playing or paused one). */
  clip?: string;
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
  /** Current time and length of each clip, in seconds. */
  clipTimes: Record<string, number>;
  clipDurations: Record<string, number>;
  seekRequest?: { time: number; clip?: string; n: number };
}

const FEATURE_ID = 'animation';
const EMPTY: AnimationState = { clips: [], status: {}, time: 0, duration: 0, clipTimes: {}, clipDurations: {} };

export interface AnimationApi extends AnimationState {
  /** Without a name, applies to all clips. */
  play: (name?: string) => void;
  pause: (name?: string) => void;
  stop: (name?: string) => void;
  /** Without a clip, jumps all clips. */
  seek: (time: number, clip?: string) => void;
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
    seek: (time, clip) => update((s) => ({ seekRequest: { time, clip, n: (s.seekRequest?.n ?? 0) + 1 } })),
  };
};

const statusPatch = (s: AnimationState, status: ClipStatus, name?: string): Partial<AnimationState> => ({
  status: Object.fromEntries(s.clips.map((c) => [c, !name || c === name ? status : (s.status[c] ?? 'stopped')])),
});

const currentState = (viewer: ViewerStore) =>
  (viewer.getState().featureState[FEATURE_ID] as AnimationState | undefined) ?? EMPTY;

/** Runs `handler` when playback crosses the cue with the given id (or any cue for `'*'`). */
export const useAnimationCue = (id: string, handler: (cue: { id: string; time: number; clip?: string }) => void) => {
  const viewer = useViewer();
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    const sub = viewer.on$('animation:cue').subscribe((cue) => (id === '*' || cue.id === id) && latest.current(cue));
    return () => sub.unsubscribe();
  }, [viewer, id]);
};

const LOOP = { repeat: LoopRepeat, once: LoopOnce, pingpong: LoopPingPong } as const;

const loopOf = (config: AnimationConfig, name: string) => config.clips[name]?.loop ?? config.loop;

const AnimationScene = () => {
  const { config, viewer } = useFeature<AnimationConfig>();
  const enabled = useFeatureEnabled();
  const gltf = useViewerState((s) => s.gltf);
  const state = useViewerState((s) => (s.featureState[FEATURE_ID] as AnimationState | undefined) ?? EMPTY);
  const { actions, mixer } = useAnimations(gltf?.animations ?? [], gltf?.scene);
  const lastTime = useRef(0);
  const lastCueTimes = useRef<Record<string, number>>({});

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
      clipDurations: Object.fromEntries(clips.map((c) => [c.name, c.duration])),
      clipTimes: {},
      status: Object.fromEntries(
        names.map((n) => [n, (config.clips[n]?.autoplay ?? start.includes(n)) ? 'playing' : 'stopped']),
      ),
      time: 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf, config.autoplay, config.clips]);

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
      action.setLoop(LOOP[loopOf(config, name)], Infinity);
      action.clampWhenFinished = loopOf(config, name) === 'once';
      action.timeScale = config.clips[name]?.speed ?? 1;
      action.paused = status === 'paused' || !enabled;
      action.play();
    });
  }, [actions, state.status, enabled, config.loop, config.clips]);

  useEffect(() => {
    if (state.seekRequest) {
      const { time, clip } = state.seekRequest;
      Object.entries(actions).forEach(([name, action]) => action && (!clip || clip === name) && (action.time = time));
      Object.keys(actions).forEach((name) => (!clip || clip === name) && (lastCueTimes.current[name] = time));
      mixer.update(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.seekRequest?.n]);

  // Pause/play commands must take effect before the mixer advances this frame, not after React re-renders.
  useFrame(() => {
    const status = currentState(viewer).status;
    Object.entries(actions).forEach(([name, action]) => {
      if (action && status[name] && status[name] !== 'stopped') {
        action.paused = status[name] === 'paused' || !enabled;
      }
    });
  }, -1);

  useFrame(() => {
    const entries = Object.entries(actions).filter(([, a]) => a);
    const playingNow = (name: string) => (state.status[name] ?? 'stopped') === 'playing' && enabled;
    const reference = entries.find(([name]) => (state.status[name] ?? 'stopped') !== 'stopped');
    const time = reference?.[1]?.time ?? 0;

    const times = Object.fromEntries(entries.map(([name, a]) => [name, a?.time ?? 0]));
    const changed =
      Math.abs(time - lastTime.current) > 0.05 ||
      entries.some(([name]) => Math.abs((times[name] ?? 0) - (state.clipTimes[name] ?? 0)) > 0.05);
    if (changed) {
      lastTime.current = time;
      patch({ time, clipTimes: times });
    }

    config.cues.forEach((cue) => {
      const name = cue.clip ?? reference?.[0];
      if (!name || !(name in times)) {
        return;
      }
      const prev = lastCueTimes.current[name] ?? 0;
      const next = times[name] ?? 0;
      if (next !== prev && playingNow(name)) {
        const duration = state.clipDurations[name] ?? state.duration;
        if (crossedCues([cue], prev, next, duration).length) {
          viewer.emit('animation:cue', { id: cue.id, time: cue.time, clip: cue.clip });
        }
      }
    });
    Object.keys(times).forEach((name) => (lastCueTimes.current[name] = times[name] ?? 0));
  });

  return null;
};

const formatTime = (value: number) => (Math.floor(value * 100) / 100).toFixed(2);

/** Full-width timeline scrubber (bottom bar). */
const Scrubber = () => {
  const { clips, time, duration, seek } = useAnimation();
  if (!clips.length) {
    return null;
  }
  const progress = duration > 0 ? Math.min(time / duration, 1) * 100 : 0;
  return (
    <Slot name="animation.scrubber">
      <input
        type="range"
        aria-label="Animation time"
        className="ds-animation-scrubber"
        data-testid="ds-animation-scrubber"
        style={{ '--ds-scrubber-progress': `${progress}%` } as React.CSSProperties}
        min={0}
        max={duration}
        step={0.01}
        value={Math.min(time, duration)}
        onChange={(e) => seek(Number(e.target.value))}
      />
    </Slot>
  );
};

/** Play/pause, time readout and clip toggles. */
const Controls = ({ config }: { config: AnimationConfig }) => {
  const { clips, status, time, duration, play, pause, stop } = useAnimation();
  if (!clips.length) {
    return null;
  }
  const playing = clips.some((c) => status[c] === 'playing');
  const visibleClips = clips.filter((c) => !config.clips[c]?.hidden);
  return (
    <Slot name="animation.controls">
      <div className="ds-animation-controls" data-playing={playing ? '' : undefined} data-testid="ds-animation-controls">
        <IconButton
          label={playing ? 'Pause' : 'Play'}
          className="ds-animation-controls__play"
          data-testid="ds-animation-play"
          icon={playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
          onClick={() => (playing ? pause() : play())}
        />
        <span className="ds-animation-controls__time" data-testid="ds-animation-time">
          <span className="ds-animation-controls__current">{formatTime(time)}</span> / {formatTime(duration)}
        </span>
        {visibleClips.length > 1 && (
          <div className="ds-animation-controls__clips" data-testid="ds-animation-clips">
            {visibleClips.map((name) => (
              <button
                key={name}
                type="button"
                className="ds-animation-controls__clip"
                data-active={status[name] === 'playing' ? '' : undefined}
                data-testid={`ds-animation-clip-${name}`}
                aria-pressed={status[name] === 'playing'}
                onClick={() => (status[name] === 'playing' ? stop(name) : play(name))}
              >
                {config.clips[name]?.label ?? name}
              </button>
            ))}
          </div>
        )}
      </div>
    </Slot>
  );
};

/** glTF extension: `ALCM_animation`. Usage: `animation.use({ autoplay: 'all', loop: 'pingpong' })` */
export const animation = defineFeature<AnimationConfig>({
  id: FEATURE_ID,
  defaults: { enabled: true, autoplay: 'all', loop: 'repeat', speed: 1, controls: true, cues: [], clips: {} },
  gltf: { extension: 'ALCM_animation' },
  toggle: { label: 'Animations' },
  scene: AnimationScene,
  setup: ({ viewer }) => {
    const apply = (patch: (s: AnimationState) => Partial<AnimationState>) => {
      const current = currentState(viewer);
      viewer.setFeatureState(FEATURE_ID, { ...current, ...patch(current) });
    };
    const subs = [
      viewer.on$('animation:seek').subscribe(({ time, clip }) =>
        apply((s) => ({ seekRequest: { time, clip, n: (s.seekRequest?.n ?? 0) + 1 } })),
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
    const region = typeof config.controls === 'object' ? (config.controls.region ?? 'bottom-left') : 'bottom-left';
    return {
      'overlay.bottom-bar': { mode: 'append', order: 0, content: <Scrubber /> },
      [`overlay.${region}`]: { mode: 'append', order: 0, content: <Controls config={config} /> },
    };
  },
});
