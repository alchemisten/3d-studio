import { z } from 'zod';

const point = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const dimension = z.number().int().min(1).max(4096);

export const sceneDescriptor = z.object({
  source: z.string().min(1),
  environment: z.string().min(1).optional(),
  draco: z.union([z.string().min(1), z.literal(false)]).optional(),
  preview: z
    .object({
      width: dimension.default(960),
      floor: z.object({
        mode: z.enum(['off', 'shadow', 'matte']).default('shadow'),
        color: z.string().regex(/^#[0-9a-f]{6}$/i).default('#aaa7a2'),
      }).optional(),
      height: dimension.default(540),
      background: z
        .string()
        .regex(/^#[0-9a-f]{6}$/i)
        .optional(),
      camera: z.object({ position: point, target: point }).optional(),
      animation: z.object({ clip: z.string().min(1), time: z.number().finite().nonnegative().default(0) }).optional(),
    })
    .default({}),
});

export type SceneDescriptor = z.input<typeof sceneDescriptor>;
export type CaptureJob = z.output<typeof sceneDescriptor>;
