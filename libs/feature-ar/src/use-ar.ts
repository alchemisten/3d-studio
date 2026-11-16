import { useEffect, useMemo, useRef } from 'react';
import { useViewerState, type ViewerStore } from '@schablone/3d-studio-core';
import { type ArAsset, resolveArAsset } from './ar-assets';
import { ArBakeError, requestArBake } from './ar-bake-client';
import { type ArLabels, resolveArLabels } from './ar-i18n';
import { buildArLandingUrl } from './ar-landing-url';
import { buildSceneViewerIntent, openQuickLook, UnsupportedArUrlError } from './ar-links';
import { AR_CLOSED, type ArFeatureState, entryState, landingState } from './ar-state';
import type { EnabledArConfig } from './config';
import type { ArEnvironment } from './device-detection';

export const AR_FEATURE_ID = 'ar';

declare module '@schablone/3d-studio-core' {
  interface ViewerEventMap {
    /** Command: the same as a tap on the AR button. */
    'ar:open': undefined;
    /** Notification: the landing prompt was dismissed or has launched, so the host can drop its landing parameter. */
    'ar:landing-consumed': undefined;
  }
}

export interface ArApi {
  state: ArFeatureState;
  asset: ArAsset;
  labels: ArLabels;
  landingUrl: string;
  open: () => void;
  start: () => void;
  close: () => void;
}

export interface UseArOptions {
  viewer: ViewerStore;
  config: EnabledArConfig;
  environment: ArEnvironment;
}

export const useAr = ({ viewer, config, environment }: UseArOptions): ArApi => {
  const state = useViewerState((s) => (s.featureState[AR_FEATURE_ID] as ArFeatureState | undefined) ?? AR_CLOSED);
  const asset = useMemo(
    () =>
      resolveArAsset({
        dimensionsMm: config.dimensionsMm,
        glb: config.glb,
        stageUrl: config.stageUrl,
        usdz: config.usdz,
      }),
    [config.dimensionsMm, config.glb, config.stageUrl, config.usdz],
  );
  const labels = useMemo(() => resolveArLabels(config.locale, config.labels), [config.locale, config.labels]);
  const landingUrl = buildArLandingUrl({
    landingUrl: config.landingUrl,
    search: window.location.search,
    stageUrl: config.stageUrl,
  });
  const baked = useRef<{ search: string; usdz: string; glb?: string } | null>(null);
  /** A bake belongs to the configuration it was made for; after another choice it is made again. */
  const bakedNow = () => (baked.current?.search === window.location.search ? baked.current : null);
  const job = useRef<AbortController | null>(null);
  const isLandingPending = useRef(config.isLanding);
  const { platform, isInApp } = environment;

  useEffect(() => {
    isLandingPending.current = config.isLanding;
    viewer.setFeatureState(AR_FEATURE_ID, { status: landingState(config.isLanding, { isInApp, platform }) });
    return () => job.current?.abort();
  }, [viewer, config.isLanding, platform, isInApp]);

  const set = (next: ArFeatureState) => viewer.setFeatureState(AR_FEATURE_ID, next);

  const finish = () => {
    job.current?.abort();
    job.current = null;
    set(AR_CLOSED);
    if (isLandingPending.current) {
      isLandingPending.current = false;
      viewer.emit('ar:landing-consumed', undefined);
    }
  };

  const prepare = async (bakeUrl: string) => {
    const run = new AbortController();
    job.current = run;
    set({ status: 'preparing' });
    try {
      const result = await requestArBake({
        bakeUrl,
        glb: asset.glb,
        locale: config.locale,
        search: window.location.search,
        signal: run.signal,
        slug: config.slug,
        stageUrl: config.stageUrl,
      });
      if (run.signal.aborted) return;
      baked.current = {
        search: window.location.search,
        usdz: result.usdz,
        ...(result.glb === undefined ? {} : { glb: result.glb }),
      };
      set({ status: 'ready' });
    } catch (error) {
      if (!(error instanceof ArBakeError)) throw error;
      if (!run.signal.aborted) set({ bakeFailure: error.reason, error: 'bake-failed', status: 'error' });
    } finally {
      if (job.current === run) job.current = null;
    }
  };

  const sceneViewerIntent = (): string | null => {
    try {
      return buildSceneViewerIntent({
        fallbackUrl: window.location.href,
        modelUrl: (config.isConfigured ? bakedNow()?.glb : undefined) ?? asset.glb,
        origin: config.stageUrl,
      });
    } catch (error) {
      if (error instanceof UnsupportedArUrlError) return null;
      throw error;
    }
  };

  /**
   * Scene Viewer returns to the page it was started from when AR is not
   * available. A page it cannot return to, such as an app's file url, is handed
   * over by link instead.
   */
  const startSceneViewer = () => {
    if (config.isConfigured && config.bakeUrl && bakedNow() === null) {
      void prepare(config.bakeUrl);
      return;
    }
    const intent = sceneViewerIntent();
    if (intent === null) {
      set({ status: 'copy' });
      return;
    }
    finish();
    environment.navigate(intent);
  };

  /**
   * Quick Look needs the anchor click to happen inside the tap that triggered
   * it, and a bake takes seconds. So the first tap only prepares: the dialog
   * then offers a launch button the user taps once the USDZ exists.
   */
  const startQuickLook = () => {
    const usdz = (config.isConfigured ? undefined : asset.usdz) ?? bakedNow()?.usdz;
    if (usdz) {
      openQuickLook(usdz);
      finish();
      return;
    }
    if (config.bakeUrl) {
      void prepare(config.bakeUrl);
      return;
    }
    set({ error: 'usdz-missing', status: 'error' });
  };

  const start = () => {
    if (platform === 'android') startSceneViewer();
    else if (platform === 'ios') startQuickLook();
    else set({ status: 'qr' });
  };

  const open = () => {
    const entry = entryState({ isInApp, platform });
    if (entry === 'launch') start();
    else set({ status: entry });
  };

  return { asset, close: finish, labels, landingUrl, open, start, state };
};
