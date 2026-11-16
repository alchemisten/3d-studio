import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { offlineConfig } from './config';
import type { Connectivity } from './core/connectivity';
import type { OfflineController, OfflineState } from './core/offline-controller';
import { offlineMessages } from './messages';
import { offline } from './offline';
import { OfflineButton } from './offline-button';
import { OfflineActions, OfflineStatus } from './offline-controls';

const createController = (initial: OfflineState) => {
  let state = initial;
  const listeners = new Set<() => void>();
  const controller: OfflineController = {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: () => () => undefined,
    save: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  };
  return {
    controller,
    set: (next: OfflineState) =>
      act(() => {
        state = next;
        listeners.forEach((listener) => listener());
      }),
  };
};

const connectivity = (isOnline: boolean): Connectivity => ({
  isOnline: () => isOnline,
  subscribe: () => () => undefined,
});

afterEach(cleanup);

describe('offlineConfig', () => {
  it('is off by default and needs a project id once enabled', () => {
    expect(offlineConfig.parse({})).toEqual({
      enabled: false,
      projectId: '',
      assets: [],
      locale: 'en',
      placement: 'bottom-right',
    });
    expect(offlineConfig.safeParse({ placement: 'top-left' }).success).toBe(false);
    expect(offlineConfig.safeParse({ enabled: true }).success).toBe(false);
    expect(offlineConfig.safeParse({ enabled: true, projectId: 'tray', locale: 'fr' }).success).toBe(false);
    expect(
      offlineConfig.parse({ enabled: true, projectId: 'tray', assets: ['/projects/tray/model.glb'], locale: 'de' }),
    ).toMatchObject({ enabled: true, projectId: 'tray', locale: 'de' });
  });

  it('contributes nothing while disabled', () => {
    const context = { id: 'offline', config: offlineConfig.parse({}), viewer: {}, overlay: {} } as never;

    expect(typeof offline.slots === 'function' && offline.slots(context)).toEqual({});
    expect(offline.setup?.(context)).toBeUndefined();
  });

  it('places the button bottom-right by default and the menu rows on request', () => {
    const slotsFor = (placement?: 'bottom-right' | 'output') => {
      const config = offlineConfig.parse({ enabled: true, projectId: 'tray', placement });
      const context = { id: 'offline', config, viewer: {}, overlay: {} } as never;
      return Object.keys(typeof offline.slots === 'function' ? offline.slots(context) : {});
    };

    expect(slotsFor()).toEqual(['overlay.bottom-right']);
    expect(slotsFor('output')).toEqual(['viewer.output', 'overlay.top-right']);
  });
});

describe('OfflineButton', () => {
  const renderButton = (initial: OfflineState, isOnline = true) => {
    const harness = createController(initial);
    render(
      <OfflineButton
        controller={harness.controller}
        connectivity={connectivity(isOnline)}
        messages={offlineMessages.de}
      />,
    );
    return { ...harness, button: screen.getByTestId<HTMLButtonElement>('ds-offline-button') };
  };

  it('shows each state on the button itself', () => {
    const { button, set } = renderButton({ status: 'idle' });
    expect(button.getAttribute('aria-label')).toBe('Offline verfügbar machen');
    expect(screen.queryByTestId('ds-offline-popup')).toBeNull();

    set({ status: 'saving', done: 1, total: 4 });
    expect(button.getAttribute('aria-label')).toBe('Wird offline gespeichert 25%');
    expect(button.querySelector('.ds-offline__ring-label')?.textContent).toBe('25');

    set({ status: 'saved', savedAt: '2026-11-15T10:00:00.000Z' });
    expect(button.getAttribute('aria-label')).toBe('Offline verfügbar');

    set({ status: 'stale', savedAt: '2026-11-15T10:00:00.000Z' });
    expect(button.getAttribute('aria-label')).toBe('Offline-Kopie ist veraltet');
    expect(screen.getByTestId('ds-offline-dot')).toBeTruthy();

    set({ status: 'error', error: new Error('HTTP 503') });
    expect(button.getAttribute('aria-label')).toBe('Offline-Speichern fehlgeschlagen');
    expect(screen.getByTestId('ds-offline').getAttribute('data-state')).toBe('error');
  });

  it('opens a popover with the connection status and the actions that fit the state', () => {
    const { button, controller, set } = renderButton({ status: 'idle' });

    act(() => button.click());
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('ds-offline-connection').textContent).toBe('Online');
    expect(screen.getByTestId('ds-offline-state').textContent).toBe('Nicht offline gespeichert');
    screen.getByRole('menuitem', { name: 'Offline verfügbar machen' }).click();
    expect(controller.save).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('ds-offline-remove')).toBeNull();

    set({ status: 'saving', done: 2, total: 4 });
    expect(screen.getByTestId('ds-offline-state').textContent).toBe('Wird offline gespeichert 2/4');
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
    expect(screen.queryAllByRole('menuitem')).toEqual([]);

    set({ status: 'saved', savedAt: '2026-11-15T10:00:00.000Z' });
    expect(screen.queryByTestId('ds-offline-save')).toBeNull();
    screen.getByRole('menuitem', { name: 'Offline-Kopie entfernen' }).click();
    expect(controller.remove).toHaveBeenCalledTimes(1);

    set({ status: 'stale', savedAt: '2026-11-15T10:00:00.000Z' });
    screen.getByRole('menuitem', { name: 'Offline-Kopie aktualisieren' }).click();
    expect(screen.getByRole('menuitem', { name: 'Offline-Kopie entfernen' })).toBeTruthy();

    set({ status: 'error', error: new Error('HTTP 503') });
    expect(screen.getByTestId('ds-offline-state').textContent).toBe('Offline-Speichern fehlgeschlagen: HTTP 503');
    screen.getByRole('menuitem', { name: 'Offline-Speichern wiederholen' }).click();
    expect(controller.save).toHaveBeenCalledTimes(3);
  });

  it('reports a lost connection and closes on Escape and on outside clicks', () => {
    const { button } = renderButton({ status: 'saved', savedAt: '2026-11-15T10:00:00.000Z' }, false);

    act(() => button.click());
    expect(screen.getByTestId('ds-offline-connection').textContent).toBe('Offline');

    act(() => void document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(screen.queryByTestId('ds-offline-popup')).toBeNull();

    act(() => button.click());
    act(() => void document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })));
    expect(screen.queryByTestId('ds-offline-popup')).toBeNull();
  });

  it('is disabled with an explaining title where offline use is impossible', () => {
    const { button } = renderButton({ status: 'unavailable' });

    expect(button.disabled).toBe(true);
    expect(button.title).toBe('Offline-Nutzung ist nicht verfügbar');
    act(() => button.click());
    expect(screen.queryByTestId('ds-offline-popup')).toBeNull();
  });
});

describe('OfflineActions', () => {
  it('offers saving, then removing and updating, in the configured language', async () => {
    const { controller, set } = createController({ status: 'idle' });
    render(<OfflineActions controller={controller} messages={offlineMessages.de} />);

    screen.getByRole('menuitem', { name: 'Offline verfügbar machen' }).click();
    expect(controller.save).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('ds-offline-remove')).toBeNull();

    set({ status: 'saving', done: 1, total: 4 });
    expect(screen.getByRole<HTMLButtonElement>('menuitem', { name: 'Wird offline gespeichert 1/4' }).disabled).toBe(
      true,
    );

    set({ status: 'saved', savedAt: '2026-11-15T10:00:00.000Z' });
    expect(screen.getByRole<HTMLButtonElement>('menuitem', { name: 'Offline verfügbar' }).disabled).toBe(true);
    screen.getByRole('menuitem', { name: 'Offline-Kopie entfernen' }).click();
    expect(controller.remove).toHaveBeenCalledTimes(1);

    set({ status: 'stale', savedAt: '2026-11-15T10:00:00.000Z' });
    screen.getByRole('menuitem', { name: 'Offline-Kopie aktualisieren' }).click();
    expect(controller.save).toHaveBeenCalledTimes(2);

    set({ status: 'error', error: new Error('HTTP 503') });
    screen.getByRole('menuitem', { name: 'Offline-Speichern wiederholen' }).click();
    expect(controller.save).toHaveBeenCalledTimes(3);
  });

  it('explains itself instead of acting where offline use is impossible', () => {
    const { controller } = createController({ status: 'unavailable' });
    render(<OfflineActions controller={controller} messages={offlineMessages.en} />);

    expect(screen.getByRole<HTMLButtonElement>('menuitem', { name: 'Offline use is not available' }).disabled).toBe(
      true,
    );
  });
});

describe('OfflineStatus', () => {
  it('shows progress, the saved state and failures', () => {
    const { controller, set } = createController({ status: 'idle' });
    render(<OfflineStatus controller={controller} connectivity={connectivity(true)} messages={offlineMessages.en} />);
    expect(screen.queryByTestId('ds-offline-status')).toBeNull();

    set({ status: 'saving', done: 1, total: 4 });
    const status = screen.getByTestId('ds-offline-status');
    expect(status.textContent).toContain('Saving for offline use 1/4');
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('25');

    set({ status: 'saved', savedAt: '2026-11-15T10:00:00.000Z' });
    expect(status.textContent).toContain('Available offline');

    set({ status: 'stale', savedAt: '2026-11-15T10:00:00.000Z' });
    expect(status.textContent).toContain('Offline copy is outdated');

    set({ status: 'error', error: new Error('HTTP 503') });
    expect(status.textContent).toContain('Saving for offline use failed: HTTP 503');
  });

  it('flags a lost connection', () => {
    const { controller } = createController({ status: 'saved', savedAt: '2026-11-15T10:00:00.000Z' });
    render(<OfflineStatus controller={controller} connectivity={connectivity(false)} messages={offlineMessages.de} />);

    expect(screen.getByTestId('ds-offline-status').textContent).toContain('Offline');
    expect(screen.getByTestId('ds-offline-status').textContent).toContain('Offline verfügbar');
  });
});
