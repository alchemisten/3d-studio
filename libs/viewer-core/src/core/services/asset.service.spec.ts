import 'reflect-metadata';
import { BehaviorSubject } from 'rxjs';

jest.mock('three/examples/jsm/loaders/DRACOLoader.js', () => ({
  DRACOLoader: class {
    public decoderPath = '';
    public setDecoderPath(path: string) {
      this.decoderPath = path;
      return this;
    }
  },
}));

jest.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    public setDRACOLoader() {
      return this;
    }
  },
}));

import type { IConfigService, ILoggerService, ViewerConfigModel } from '../../types';
import { Constants } from '../../util';
import { AssetService } from './asset.service';
import { defaultAssetConfig } from './config.service';

const createAssetService = (config: ViewerConfigModel) => {
  const config$ = new BehaviorSubject<ViewerConfigModel>(config);
  const configService = {
    getConfig: () => config$.asObservable(),
    loadConfig: (next: ViewerConfigModel) => config$.next(next),
  } as IConfigService;
  const loggerService = {
    withOptions: () => ({
      debug: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      info: jest.fn(),
      trace: jest.fn(),
      warn: jest.fn(),
    }),
  } as unknown as ILoggerService;

  const service = new AssetService(configService, loggerService);

  return { configService, service };
};

const getDecoderPath = (service: AssetService): string =>
  (service as unknown as { dracoLoader: { decoderPath: string } }).dracoLoader.decoderPath;

describe('AssetService draco decoder path', () => {
  it('uses the google static decoder url by default', () => {
    const { service } = createAssetService({ objects: [] });

    expect(defaultAssetConfig.dracoDecoderPath).toBe(Constants.DRACO_GOOGLE_STATIC_DECODER_URL);
    expect(getDecoderPath(service)).toBe(Constants.DRACO_GOOGLE_STATIC_DECODER_URL);
  });

  it('honours a decoder path provided by the config', () => {
    const { service } = createAssetService({ assets: { dracoDecoderPath: '/local/draco/' }, objects: [] });

    expect(getDecoderPath(service)).toBe('/local/draco/');
  });

  it('falls back to the default when a new config omits the decoder path', () => {
    const { configService, service } = createAssetService({
      assets: { dracoDecoderPath: '/local/draco/' },
      objects: [],
    });
    configService.loadConfig({ objects: [] });

    expect(getDecoderPath(service)).toBe(Constants.DRACO_GOOGLE_STATIC_DECODER_URL);
  });
});
