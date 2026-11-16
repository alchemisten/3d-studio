export type Platform = 'ios' | 'android' | 'desktop';

/**
 * An iPad reports a Macintosh user agent since iPadOS 13, so touch points are
 * what separate it from a real Mac.
 */
export const detectPlatform = (userAgent: string, maxTouchPoints: number): Platform => {
  if (/iPad|iPhone|iPod/u.test(userAgent)) return 'ios';
  if (/Macintosh/u.test(userAgent) && maxTouchPoints > 1) return 'ios';
  if (/Android/u.test(userAgent)) return 'android';
  return 'desktop';
};

export const detectCurrentPlatform = (): Platform => detectPlatform(navigator.userAgent, navigator.maxTouchPoints);

/**
 * Content apps serve the viewer from a file url. Quick Look and Scene Viewer
 * cannot be reached from there, and the page itself cannot be handed to them.
 */
export const isPhoneAppPage = (href: string): boolean => new URL(href).protocol === 'file:';

export const isEmbeddedWebView = (search: string): boolean => new URLSearchParams(search).get('a') === 'true';

const IN_APP_USER_AGENT = /FBAN|FBAV|FB_IAB|Instagram|Line\/|; wv\)/u;

export interface BrowserContext {
  href: string;
  search: string;
  userAgent: string;
}

/**
 * In-app browsers and app web views neither open Quick Look nor resolve the
 * Scene Viewer intent, so AR has to be handed over to the system browser.
 */
export const isInAppBrowser = ({ href, search, userAgent }: BrowserContext): boolean =>
  isPhoneAppPage(href) || isEmbeddedWebView(search) || IN_APP_USER_AGENT.test(userAgent);

export interface ArEnvironment {
  platform: Platform;
  isInApp: boolean;
  navigate: (url: string) => void;
}

export const detectArEnvironment = (): ArEnvironment => ({
  platform: detectCurrentPlatform(),
  isInApp: isInAppBrowser({
    href: window.location.href,
    search: window.location.search,
    userAgent: navigator.userAgent,
  }),
  navigate: (url) => window.location.assign(url),
});
