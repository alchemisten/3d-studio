import { provideSingleton } from 'util/inversify';
import { IConfigService, ViewerConfigModel } from '../../types';

@provideSingleton(ConfigService)
export class ConfigService implements IConfigService {
    private config: ViewerConfigModel;

    constructor() {
    }

    getConfig(): ViewerConfigModel {
        return this.config;
    }

    loadConfig(config: ViewerConfigModel) {
        this.config = config;
    }
}
