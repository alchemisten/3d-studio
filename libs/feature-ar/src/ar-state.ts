import type { ArBakeFailure } from './ar-bake-client';
import type { ArEnvironment } from './device-detection';

export type ArState = 'closed' | 'qr' | 'copy' | 'launch' | 'preparing' | 'ready' | 'error';

export type ArErrorReason = 'usdz-missing' | 'bake-failed';

export interface ArFeatureState {
  status: ArState;
  error?: ArErrorReason;
  bakeFailure?: ArBakeFailure;
}

export const AR_CLOSED: ArFeatureState = { status: 'closed' };

export type ArDevice = Pick<ArEnvironment, 'platform' | 'isInApp'>;

/**
 * Where a tap on the AR button leads. `launch` means the device can start AR
 * itself; a desktop hands over by QR code and an in-app browser by link.
 */
export const entryState = ({ platform, isInApp }: ArDevice): 'qr' | 'copy' | 'launch' => {
  if (platform === 'desktop') return 'qr';
  return isInApp ? 'copy' : 'launch';
};

/**
 * The landing flag is evaluated before anything about the device, so every
 * device that was sent here for AR gets its own way in: a desktop the QR code,
 * a phone the launch dialog, an in-app browser the link.
 */
export const landingState = (isLanding: boolean, device: ArDevice): ArState =>
  isLanding ? entryState(device) : 'closed';
