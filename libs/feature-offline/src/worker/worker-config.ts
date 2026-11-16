import * as z from 'zod/mini';

/** Name of the global the host assigns the worker config to, ahead of the worker script. */
export const WORKER_CONFIG_GLOBAL = '__STUDIO_OFFLINE_WORKER__';

export const workerConfig = z.object({
  /** Names the shell cache; changes whenever a precached file changes. */
  version: z.string().check(z.minLength(1)),
  /** App shell files, relative to the worker script. */
  precache: z._default(
    z.array(z.object({ url: z.string().check(z.minLength(1)), revision: z.string().check(z.minLength(1)) })),
    [],
  ),
  /** Precached page answering navigations that cannot reach the network, relative to the worker script. */
  navigationFallback: z._default(z.nullable(z.string().check(z.minLength(1))), null),
  /** Regular expression sources, tested against the path of same-origin requests. Matches are never handled. */
  denylist: z._default(z.array(z.string()), []),
  /** Regular expression sources, tested against the full request URL. Matches go to the network first. */
  networkFirst: z._default(z.array(z.string()), []),
  /** How long a network-first request may take before the saved copy answers. */
  networkTimeoutMs: z._default(z.number().check(z.int(), z.positive()), 5_000),
});

export type WorkerConfig = z.output<typeof workerConfig>;
export type WorkerConfigInput = z.input<typeof workerConfig>;

/** The only message the worker acts on: activate a waiting version now. */
export const SKIP_WAITING_MESSAGE = { type: 'SKIP_WAITING' } as const;
