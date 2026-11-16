import { describe, expect, it } from 'vitest';
import { detectPlatform, isEmbeddedWebView, isInAppBrowser, isPhoneAppPage } from './device-detection';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15';
const IPAD_DESKTOP_MODE = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36';
const ANDROID_WEB_VIEW = 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36';
const INSTAGRAM = `${IPHONE} Instagram 320.0.0.0`;
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

describe('detectPlatform', () => {
  it('detects an iPhone', () => {
    expect(detectPlatform(IPHONE, 5)).toBe('ios');
  });

  it('detects an iPad reporting itself as a Mac, by touch points', () => {
    expect(detectPlatform(IPAD_DESKTOP_MODE, 5)).toBe('ios');
  });

  it('does not mistake a real Mac for an iPad', () => {
    expect(detectPlatform(MAC, 0)).toBe('desktop');
  });

  it('detects Android', () => {
    expect(detectPlatform(ANDROID, 5)).toBe('android');
  });

  it('falls back to desktop', () => {
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0)).toBe('desktop');
  });
});

describe('isEmbeddedWebView', () => {
  it('detects the native app shell', () => {
    expect(isEmbeddedWebView('?a=true')).toBe(true);
  });

  it('is false for a normal browser visit', () => {
    expect(isEmbeddedWebView('?h=320')).toBe(false);
    expect(isEmbeddedWebView('')).toBe(false);
  });
});

describe('isPhoneAppPage', () => {
  it('recognises a content app on iOS and Android, which serves the viewer from a file url', () => {
    expect(isPhoneAppPage('file:///var/mobile/viewer.zip_unpacked/embedded.html?p=tray')).toBe(true);
  });

  it('leaves a desktop app with its own scheme alone', () => {
    expect(isPhoneAppPage('viewer://app-data/viewer.zip_unpacked/index.html?p=tray')).toBe(false);
  });

  it('leaves the web alone', () => {
    expect(isPhoneAppPage('https://x.test/view/tray')).toBe(false);
  });
});

describe('isInAppBrowser', () => {
  const web = { href: 'https://x.test/view/tray', search: '', userAgent: ANDROID };

  it('is false for a system browser on the web', () => {
    expect(isInAppBrowser(web)).toBe(false);
    expect(isInAppBrowser({ ...web, userAgent: IPHONE })).toBe(false);
  });

  it('recognises a page served from a file url', () => {
    expect(isInAppBrowser({ ...web, href: 'file:///data/viewer/index.html' })).toBe(true);
  });

  it('recognises the native app shell', () => {
    expect(isInAppBrowser({ ...web, search: '?a=true' })).toBe(true);
  });

  it('recognises an Android web view and a social in-app browser', () => {
    expect(isInAppBrowser({ ...web, userAgent: ANDROID_WEB_VIEW })).toBe(true);
    expect(isInAppBrowser({ ...web, userAgent: INSTAGRAM })).toBe(true);
  });
});
