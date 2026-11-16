import { describe, expect, it } from 'vitest';
import { isArLanding } from './ar-landing';
import { buildArLandingUrl } from './ar-landing-url';
import { entryState, landingState } from './ar-state';

describe('isArLanding', () => {
  it('is true for ar=1', () => {
    expect(isArLanding('?ar=1')).toBe(true);
  });

  it('is false when ar is missing', () => {
    expect(isArLanding('?lang=de')).toBe(false);
  });

  it('is false for any other ar value', () => {
    expect(isArLanding('?ar=true')).toBe(false);
  });
});

describe('landingState', () => {
  it('stays closed without the landing flag, whatever the device', () => {
    expect(landingState(false, { isInApp: false, platform: 'desktop' })).toBe('closed');
    expect(landingState(false, { isInApp: false, platform: 'ios' })).toBe('closed');
    expect(landingState(false, { isInApp: true, platform: 'android' })).toBe('closed');
  });

  it('shows the QR code on a desktop that was opened for AR', () => {
    expect(landingState(true, { isInApp: false, platform: 'desktop' })).toBe('qr');
  });

  it('shows the launch dialog on a phone that was opened for AR', () => {
    expect(landingState(true, { isInApp: false, platform: 'ios' })).toBe('launch');
    expect(landingState(true, { isInApp: false, platform: 'android' })).toBe('launch');
  });

  it('hands over by link inside an in-app browser', () => {
    expect(landingState(true, { isInApp: true, platform: 'ios' })).toBe('copy');
    expect(landingState(true, { isInApp: true, platform: 'android' })).toBe('copy');
  });
});

describe('entryState', () => {
  it('launches on a phone, hands over by QR code on a desktop and by link in an in-app browser', () => {
    expect(entryState({ isInApp: false, platform: 'android' })).toBe('launch');
    expect(entryState({ isInApp: false, platform: 'desktop' })).toBe('qr');
    expect(entryState({ isInApp: true, platform: 'android' })).toBe('copy');
  });
});

describe('buildArLandingUrl', () => {
  const stageUrl = 'https://x.test/';

  it('adds ar=1 to a bare url', () => {
    expect(buildArLandingUrl({ landingUrl: 'https://x.test/app/', stageUrl })).toBe('https://x.test/app/?ar=1');
  });

  it('resolves a relative landing page against the stage', () => {
    expect(buildArLandingUrl({ landingUrl: 'app/viewer/index.html', stageUrl })).toBe(
      'https://x.test/app/viewer/index.html?ar=1',
    );
  });

  it('preserves the query string and hash of the landing page', () => {
    expect(buildArLandingUrl({ landingUrl: 'https://x.test/app/?project=tray&lang=de#top', stageUrl })).toBe(
      'https://x.test/app/?project=tray&lang=de&ar=1#top',
    );
  });

  it('leaves an existing ar=1 alone', () => {
    expect(buildArLandingUrl({ landingUrl: 'https://x.test/app/?ar=1&h=320', stageUrl })).toBe(
      'https://x.test/app/?ar=1&h=320',
    );
  });

  it('carries the query string of the current page along', () => {
    expect(
      buildArLandingUrl({ landingUrl: 'https://x.test/app/?project=tray', search: '?h=320&g=a&g=b', stageUrl }),
    ).toBe('https://x.test/app/?project=tray&h=320&g=a&g=b&ar=1');
  });

  it('lets the landing page win a clash and drops app-only parameters', () => {
    expect(
      buildArLandingUrl({
        landingUrl: 'https://x.test/app/?project=tray',
        search: '?project=other&a=true&lang=en',
        stageUrl,
      }),
    ).toBe('https://x.test/app/?project=tray&lang=en&ar=1');
  });
});
