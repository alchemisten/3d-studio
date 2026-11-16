import { Field, SegmentedControl, Select, Slider, Switch } from '@schablone/3d-studio-ui';
import { ColorInput, CommitOnRelease, TextInput } from '../fields';
import type { SetConfig, SettingsContext, SettingsField } from './settings-section';

export interface SettingsFieldViewProps {
  field: SettingsField;
  context: SettingsContext;
  setConfig: SetConfig;
  /** Finishes an edit in progress. */
  commit: () => void;
}

/** Renders one settings field as the control of its kind. */
export const SettingsFieldView = ({ field, context, setConfig, commit }: SettingsFieldViewProps) => {
  if (field.kind === 'custom') return field.render({ context, setConfig, commit });
  if (field.visible && !field.visible(context)) return null;

  const { config, viewer, t } = context;
  const label = t(field.label);
  const value = config[field.key];
  const set = (next: unknown, transient = false) => {
    setConfig({ [field.key]: next }, { transient });
    if (context.isLive(field.key)) field.apply?.(viewer, next);
  };

  switch (field.kind) {
    case 'switch':
      return (
        <Field label={label}>
          {(id) => <Switch id={id} label={label} checked={value === true} onCheckedChange={(next) => set(next)} />}
        </Field>
      );
    case 'color':
      return (
        <Field label={label}>
          {(id) => (
            <ColorInput
              id={id}
              value={typeof value === 'string' ? value : undefined}
              fallback={field.fallback}
              onValueChange={(next) => set(next, true)}
              onCommit={commit}
            />
          )}
        </Field>
      );
    case 'slider':
      return (
        <Field label={label}>
          {() => (
            <CommitOnRelease onCommit={commit}>
              <Slider
                label={label}
                value={typeof value === 'number' ? value : field.min}
                min={field.min}
                max={field.max}
                step={field.step}
                onValueChange={(next) => set(next, true)}
              />
            </CommitOnRelease>
          )}
        </Field>
      );
    case 'text':
      return (
        <Field label={label}>
          {(id) => (
            <TextInput
              id={id}
              value={typeof value === 'string' ? value : ''}
              placeholder={field.placeholder}
              onValueChange={(next) => set(next, true)}
              onCommit={commit}
            />
          )}
        </Field>
      );
    case 'choice': {
      const options = field.options(context).map((option) => ({ value: option.value, label: t(option.label) }));
      const current = field.toOption ? field.toOption(value, context) : typeof value === 'string' ? value : '';
      const choose = (option: string) => set(field.fromOption ? field.fromOption(option) : option);
      return field.presentation === 'segmented' ? (
        <Field label={label}>
          {() => <SegmentedControl label={label} value={current} options={options} onValueChange={choose} />}
        </Field>
      ) : (
        <Field label={label}>
          {(id) => <Select id={id} label={label} value={current} options={options} onValueChange={choose} />}
        </Field>
      );
    }
  }
};
