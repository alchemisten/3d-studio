import { z } from 'zod';
import { isRecord } from '../record';
import { defaultSettingsSections } from './default-sections';
import type { SettingsSection } from './settings-section';

export interface SceneSettingsConfig {
  /** The feature settings on offer; each shows while its feature is part of the viewer. */
  sections: SettingsSection[];
  /** Offer capturing and resetting the opening view. */
  openingCamera: boolean;
}

const isSection = (value: unknown): value is SettingsSection =>
  isRecord(value) &&
  typeof value.featureId === 'string' &&
  typeof value.title === 'string' &&
  Array.isArray(value.fields);

export const sceneSettingsConfig = z.object({
  sections: z.array(z.custom<SettingsSection>(isSection)).default(defaultSettingsSections),
  openingCamera: z.boolean().default(true),
});
