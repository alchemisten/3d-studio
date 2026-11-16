import { type FeatureContext, resolveFeatureConfig, ViewerContext, ViewerStore } from '@schablone/3d-studio-core';
import { Slot, type SlotFillsInput, SlotProvider } from '@schablone/3d-studio-ui';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArFeatureState } from './ar-state';
import type { ArConfig, EnabledArConfig } from './config';
import type { ArEnvironment, Platform } from './device-detection';
import { ar, ArLayer } from './index';

const base = {
  enabled: true,
  glb: 'projects/tray/model.glb',
  landingUrl: 'app/viewer/index.html?project=tray',
  locale: 'en',
  slug: 'tray',
  stageUrl: 'https://x.test/',
} as const;

const LANDING_URL = 'https://x.test/app/viewer/index.html?project=tray&ar=1';

const stateOf = (viewer: ViewerStore) => viewer.getState().featureState[ar.id] as ArFeatureState;

const mount = (overrides: Partial<EnabledArConfig>, platform: Platform, isInApp = false) => {
  const viewer = new ViewerStore();
  const config = resolveFeatureConfig({ feature: ar, props: { ...base, ...overrides } }) as EnabledArConfig;
  const environment: ArEnvironment = { isInApp, navigate: vi.fn(), platform };
  const consumed = vi.fn();
  viewer.on$('ar:landing-consumed').subscribe(consumed);
  render(
    <ViewerContext.Provider value={viewer}>
      <ArLayer viewer={viewer} config={config} environment={environment} />
    </ViewerContext.Provider>,
  );
  return { consumed, environment, open: () => act(() => viewer.emit('ar:open', undefined)), viewer };
};

const quickLookClicks = () => {
  const clicked: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push(`${this.rel} ${this.href}`);
  });
  return clicked;
};

const respond = (status: number, body: unknown) => ({ status, text: async () => JSON.stringify(body) });

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false;
  };
});

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ar feature', () => {
  it('contributes nothing while disabled', () => {
    const config = resolveFeatureConfig({ feature: ar });
    const slots = ar.slots as (context: Pick<FeatureContext<ArConfig>, 'config' | 'viewer'>) => SlotFillsInput;

    expect(slots({ config, viewer: new ViewerStore() })).toEqual({});
  });

  it('adds a labelled action to the Output menu by default', () => {
    const viewer = new ViewerStore();
    const config = resolveFeatureConfig({ feature: ar, props: { ...base, locale: 'de' } });
    const slots = ar.slots as (context: Pick<FeatureContext<ArConfig>, 'config' | 'viewer'>) => SlotFillsInput;
    const fills = slots({ config, viewer });
    render(
      <ViewerContext.Provider value={viewer}>
        <SlotProvider slots={fills}>
          <Slot name="viewer.output" />
          <Slot name="overlay.top-right" />
          <Slot name="viewer.layer" />
        </SlotProvider>
      </ViewerContext.Provider>,
    );

    expect(Object.keys(fills).sort()).toEqual(['viewer.layer', 'viewer.output']);
    expect(screen.queryByTestId('ds-ar-button')).toBeNull();
    const action = screen.getByRole('menuitem', { name: 'In AR ansehen' });
    expect(action.querySelector('svg')).not.toBeNull();

    fireEvent.click(action);

    expect(stateOf(viewer).status).toBe('qr');
  });

  it('puts a button top right instead when asked to, opening the QR handover on a desktop', async () => {
    const viewer = new ViewerStore();
    const config = resolveFeatureConfig({ feature: ar, props: { ...base, placement: 'button' } });
    const slots = ar.slots as (context: Pick<FeatureContext<ArConfig>, 'config' | 'viewer'>) => SlotFillsInput;
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(
      <ViewerContext.Provider value={viewer}>
        <SlotProvider slots={slots({ config, viewer })}>
          <Slot name="viewer.output" />
          <Slot name="overlay.top-right" />
          <Slot name="viewer.layer" />
        </SlotProvider>
      </ViewerContext.Provider>,
    );

    expect(screen.queryByRole('menuitem')).toBeNull();
    expect(stateOf(viewer).status).toBe('closed');
    fireEvent.click(screen.getByRole('button', { name: 'View in AR' }));

    expect(stateOf(viewer).status).toBe('qr');
    expect(screen.getByTestId('ds-ar-qr').getAttribute('src')).toMatch(/^data:image\/svg\+xml/u);
    expect(screen.getByTestId('ds-ar-link').textContent).toBe(LANDING_URL);

    await act(async () => fireEvent.click(screen.getByText('Copy link')));

    expect(writeText).toHaveBeenCalledWith(LANDING_URL);
    expect(screen.getByText('Link copied')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(stateOf(viewer).status).toBe('closed');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  });

  it('carries the query string of the page into the landing url', () => {
    window.history.replaceState(null, '', '/?color=sage');
    const { open } = mount({}, 'desktop');

    open();

    expect(screen.getByTestId('ds-ar-link').textContent).toBe(
      'https://x.test/app/viewer/index.html?project=tray&color=sage&ar=1',
    );
  });

  it('opens Quick Look with the USDZ on iOS', () => {
    const clicked = quickLookClicks();
    const { open, viewer } = mount({ usdz: 'projects/tray/model.usdz' }, 'ios');

    open();

    expect(clicked).toEqual(['ar https://x.test/projects/tray/model.usdz']);
    expect(stateOf(viewer).status).toBe('closed');
  });

  it('opens Scene Viewer with the GLB on Android', () => {
    const { environment, open, viewer } = mount({}, 'android');

    open();

    expect(environment.navigate).toHaveBeenCalledTimes(1);
    const intent = vi.mocked(environment.navigate).mock.calls[0][0];
    expect(intent).toContain(`file=${encodeURIComponent('https://x.test/projects/tray/model.glb')}`);
    expect(intent).toContain(`S.browser_fallback_url=${encodeURIComponent('http://localhost:3000/')}`);
    expect(stateOf(viewer).status).toBe('closed');
  });

  it('hands over by link inside an in-app browser instead of launching', () => {
    const clicked = quickLookClicks();
    const android = mount({}, 'android', true);

    android.open();

    expect(android.environment.navigate).not.toHaveBeenCalled();
    expect(stateOf(android.viewer).status).toBe('copy');
    expect(screen.getByText(/AR opens in Chrome/u)).toBeTruthy();

    const ios = mount({ usdz: 'model.usdz' }, 'ios', true);
    ios.open();

    expect(clicked).toEqual([]);
    expect(stateOf(ios.viewer).status).toBe('copy');
    expect(screen.getByText(/AR opens in Safari/u)).toBeTruthy();
  });

  it('falls back to the link when Android runs on a page Scene Viewer cannot return to', () => {
    vi.stubGlobal('location', { href: 'file:///data/viewer/index.html', search: '' });
    const { environment, open, viewer } = mount({}, 'android');

    open();

    expect(environment.navigate).not.toHaveBeenCalled();
    expect(stateOf(viewer).status).toBe('copy');
    expect(screen.getByTestId('ds-ar-link').textContent).toBe(LANDING_URL);
  });

  it('explains on iOS that a scene without USDZ and without a bake has no AR file', () => {
    const clicked = quickLookClicks();
    const { open, viewer } = mount({}, 'ios');

    open();

    expect(clicked).toEqual([]);
    expect(stateOf(viewer)).toEqual({ error: 'usdz-missing', status: 'error' });
    expect(screen.getByRole('alert').textContent).toBe('This model has no AR file for iPhone and iPad.');
    expect(screen.queryByText('Try again')).toBeNull();
  });

  it('prepares a USDZ on demand and launches it on the next tap', async () => {
    const clicked = quickLookClicks();
    const fetchMock = vi.fn().mockResolvedValue(respond(200, { usdz: '/ar/baked.usdz' }));
    vi.stubGlobal('fetch', fetchMock);
    const { open, viewer } = mount({ bakeUrl: 'api/ar/bake' }, 'ios');

    await act(async () => viewer.emit('ar:open', undefined));

    expect(fetchMock.mock.calls[0][0]).toBe('https://x.test/api/ar/bake?product=tray&locale=en');
    expect(stateOf(viewer).status).toBe('ready');
    expect(clicked).toEqual([]);

    fireEvent.click(screen.getByText('Start AR'));

    expect(clicked).toEqual(['ar https://x.test/ar/baked.usdz']);
    expect(stateOf(viewer).status).toBe('closed');

    open();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(clicked).toHaveLength(2);
  });

  it('shows the preparing state while the bake runs and drops its result when closed', async () => {
    const answers: Array<(value: unknown) => void> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise((resolve) => answers.push(resolve))),
    );
    const { open, viewer } = mount({ bakeUrl: 'api/ar/bake' }, 'ios');

    open();

    expect(stateOf(viewer).status).toBe('preparing');
    expect(screen.getByText('Preparing …').closest('button')?.disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await act(async () => answers[0](respond(200, { usdz: '/ar/baked.usdz' })));

    expect(stateOf(viewer).status).toBe('closed');
  });

  it('offers a retry when the bake fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond(400, { error: 'Unknown product' }))
      .mockResolvedValueOnce(respond(200, { usdz: '/ar/baked.usdz' }));
    vi.stubGlobal('fetch', fetchMock);
    const { viewer } = mount({ bakeUrl: 'api/ar/bake' }, 'ios');

    await act(async () => viewer.emit('ar:open', undefined));

    expect(stateOf(viewer)).toEqual({ bakeFailure: 'rejected', error: 'bake-failed', status: 'error' });
    expect(screen.getByRole('alert').textContent).toBe('The model could not be prepared for AR. Please try again.');

    await act(async () => fireEvent.click(screen.getByText('Try again')));

    expect(stateOf(viewer).status).toBe('ready');
  });

  it('shows the QR code straight away on a desktop that was opened for AR', () => {
    const { consumed, viewer } = mount({ isLanding: true }, 'desktop');

    expect(stateOf(viewer).status).toBe('qr');
    expect(screen.getByTestId('ds-ar-qr')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(stateOf(viewer).status).toBe('closed');
    expect(consumed).toHaveBeenCalledTimes(1);
  });

  it('shows the launch dialog straight away on a phone that was opened for AR', () => {
    const clicked = quickLookClicks();
    const { consumed, viewer } = mount(
      { dimensionsMm: { height: 320, length: 600, width: 400 }, isLanding: true, locale: 'de', usdz: 'model.usdz' },
      'ios',
    );

    expect(stateOf(viewer).status).toBe('launch');
    expect(screen.getByText('Im Raum ansehen')).toBeTruthy();
    expect(screen.getByText('600 × 400 × 320 mm')).toBeTruthy();
    expect(clicked).toEqual([]);

    fireEvent.click(screen.getByText('AR starten'));

    expect(clicked).toEqual(['ar https://x.test/model.usdz']);
    expect(stateOf(viewer).status).toBe('closed');
    expect(consumed).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape and on a click on the backdrop', () => {
    const { open, viewer } = mount({}, 'desktop');

    open();
    fireEvent(screen.getByTestId('ds-ar-dialog'), new Event('cancel', { cancelable: true }));
    expect(stateOf(viewer).status).toBe('closed');

    open();
    fireEvent.click(screen.getByTestId('ds-ar-dialog'));
    expect(stateOf(viewer).status).toBe('closed');
  });
});
