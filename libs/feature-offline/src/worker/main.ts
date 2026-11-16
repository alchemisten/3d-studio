import { installOfflineWorker } from './install-worker';
import { WORKER_CONFIG_GLOBAL, workerConfig } from './worker-config';
import type { WorkerScope } from './worker-scope';

const scope = globalThis as unknown as WorkerScope & Record<string, unknown>;

installOfflineWorker(scope, workerConfig.parse(scope[WORKER_CONFIG_GLOBAL]));
