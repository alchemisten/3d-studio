import { z } from 'zod';

export const offlineConfig = z
  .object({
    enabled: z.boolean().default(false),
    /** Identifies the saved copy; required once enabled. */
    projectId: z.string().default(''),
    /** URLs of everything the project needs offline: model, textures, environment, project record. */
    assets: z.array(z.string().min(1)).default([]),
    locale: z.enum(['de', 'en']).default('en'),
    /** `bottom-right`: one button with a popover in that overlay corner. `output`: rows in the Output menu plus a status badge. */
    placement: z.enum(['bottom-right', 'output']).default('bottom-right'),
    /** Scope of the offline worker when it differs from the worker controlling the page. */
    scope: z.string().min(1).optional(),
  })
  .refine((config) => !config.enabled || config.projectId.length > 0, {
    path: ['projectId'],
    message: 'An enabled offline feature needs a projectId.',
  });

export type OfflineConfig = z.output<typeof offlineConfig>;
export type OfflineLocale = OfflineConfig['locale'];
