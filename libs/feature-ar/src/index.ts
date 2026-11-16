export { ar, ArLayer, type ArLayerProps } from './ar';
export { arConfig, type ArConfig, type EnabledArConfig } from './config';
export { AR_LABEL_KEYS, AR_LOCALES, arLabels, resolveArLabels } from './ar-i18n';
export type { ArLabelKey, ArLabels, ArLocale } from './ar-i18n';
export { AR_CLOSED, entryState, landingState } from './ar-state';
export type { ArDevice, ArErrorReason, ArFeatureState, ArState } from './ar-state';
export { AR_FEATURE_ID, useAr, type ArApi, type UseArOptions } from './use-ar';
export { AR_LANDING_PARAM, isArLanding } from './ar-landing';
export { buildArLandingUrl, type ArLandingUrlOptions } from './ar-landing-url';
export {
  buildSceneViewerIntent,
  isWebReference,
  openQuickLook,
  removeArLandingParam,
  toAbsoluteUrl,
  UnsupportedArUrlError,
  type SceneViewerOptions,
} from './ar-links';
export { formatDimensions, resolveArAsset } from './ar-assets';
export type { ArAsset, ArAssetSource, ArDimensions } from './ar-assets';
export { AR_BAKE_TIMEOUT_MS, ArBakeError, buildBakeUrl, requestArBake } from './ar-bake-client';
export type { ArBakeFailure, ArBakeRequest, ArBakeResult } from './ar-bake-client';
export { copyText, CopyTextError } from './copy-text';
export {
  detectArEnvironment,
  detectCurrentPlatform,
  detectPlatform,
  isEmbeddedWebView,
  isInAppBrowser,
  isPhoneAppPage,
} from './device-detection';
export type { ArEnvironment, BrowserContext, Platform } from './device-detection';
