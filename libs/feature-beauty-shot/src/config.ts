import { z } from 'zod';

const preset = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  samples: z.number().int().min(1).max(2048),
  denoise: z.boolean(),
});
export const beautyConfig = z.object({
  enabled: z.boolean().default(false),
  layout: z.enum(['direct', 'quality', 'details']).default('quality'),
  initial: z.string().default('standard'),
  presets: z
    .array(preset)
    .nonempty()
    .default([
      { id: 'quick', label: 'Quick', samples: 8, denoise: true },
      { id: 'standard', label: 'Standard', samples: 32, denoise: true },
      { id: 'high', label: 'High', samples: 128, denoise: true },
    ]),
});
export type BeautyConfig = z.output<typeof beautyConfig>;
