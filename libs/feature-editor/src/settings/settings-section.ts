import type { ReactNode } from 'react';
import type { ViewerStore } from '@schablone/3d-studio-core';
import type { Translate } from '../messages';

export interface SettingsContext {
  /** The feature's resolved config (defaults, glTF extension, `use()` props and the edited overrides). */
  config: Record<string, unknown>;
  viewer: ViewerStore;
  t: Translate;
  /** Locale of the editor UI. */
  locale: string;
  /** Whether the editing viewport runs with the stored value of a key; `false` while it is overridden. */
  isLive: (key: string) => boolean;
}

/** Merges a patch into the feature's config; `transient` while the edit is still in progress. */
export type SetConfig = (patch: Record<string, unknown>, options?: { transient?: boolean }) => void;

export interface SettingsOption {
  value: string;
  /** Message key or literal text. */
  label: string;
}

interface FieldBase {
  /** Config key the field edits. */
  key: string;
  /** Message key or literal text. */
  label: string;
  /** Hides the field while it returns `false`. */
  visible?: (context: SettingsContext) => boolean;
  /** Carries the value over to the running viewer where the config alone is only read once. */
  apply?: (viewer: ViewerStore, value: unknown) => void;
}

export interface SwitchField extends FieldBase {
  kind: 'switch';
}

export interface ColorField extends FieldBase {
  kind: 'color';
  /** Shown while the config holds no `#rrggbb` colour. */
  fallback?: string;
}

export interface SliderField extends FieldBase {
  kind: 'slider';
  min: number;
  max: number;
  step: number;
}

export interface TextField extends FieldBase {
  kind: 'text';
  placeholder?: string;
}

export interface ChoiceField extends FieldBase {
  kind: 'choice';
  presentation: 'segmented' | 'select';
  options: (context: SettingsContext) => SettingsOption[];
  /** Converts between the config value and the option value; defaults to the string itself. */
  toOption?: (value: unknown, context: SettingsContext) => string;
  fromOption?: (option: string) => unknown;
}

export interface CustomFieldProps {
  context: SettingsContext;
  setConfig: SetConfig;
  /** Finishes an edit in progress. */
  commit: () => void;
}

export interface CustomField {
  kind: 'custom';
  key: string;
  render: (props: CustomFieldProps) => ReactNode;
}

export type SettingsField = SwitchField | ColorField | SliderField | TextField | ChoiceField | CustomField;

/** The settings of one viewer feature; shown while that feature is part of the viewer. */
export interface SettingsSection {
  /** Id of the feature whose config the section edits. */
  featureId: string;
  /** Message key or literal text. */
  title: string;
  fields: SettingsField[];
  /** Hides the section while it returns `false`, e.g. when the model has nothing to configure. */
  available?: (context: SettingsContext) => boolean;
}
