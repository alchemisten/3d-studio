import { Plus, Trash2 } from 'lucide-react';
import type { Mesh, Object3D } from 'three';
import { Button, Field, IconButton, Select } from '@schablone/3d-studio-ui';
import { ColorInput, Row, TextInput } from '../fields';
import type { CustomFieldProps } from './settings-section';

interface TintColor {
  id: string;
  label: string;
  color: string;
}

const NO_MATERIAL = 'none';
const NEW_COLOR = '#808080';

/** Names of the model's materials that have a colour, without duplicates. */
export const tintableMaterialNames = (scene: Object3D | undefined): string[] => {
  const names = new Set<string>();
  scene?.traverse((object) => {
    const { material } = object as Mesh;
    (Array.isArray(material) ? material : [material]).forEach((entry) => {
      if (entry && 'color' in entry && entry.name) names.add(entry.name);
    });
  });
  return [...names];
};

/** The smallest unused id of the form `color-<n>`. */
export const nextColorId = (colors: readonly { id: string }[]): string => {
  const taken = new Set(colors.map((color) => color.id));
  const free = Array.from({ length: colors.length + 1 }, (_, index) => `color-${index + 1}`);
  return free.find((id) => !taken.has(id)) ?? `color-${colors.length + 1}`;
};

/** Settings of a colour-switcher feature: its name, the tinted material and the colours viewers may choose. */
export const TintFields = ({ context, setConfig, commit }: CustomFieldProps) => {
  const { config, viewer, t } = context;
  const label = typeof config.label === 'string' ? config.label : '';
  const materials = Array.isArray(config.materials) ? (config.materials as string[]) : [];
  const colors = Array.isArray(config.colors) ? (config.colors as TintColor[]) : [];
  const names = [...new Set([...materials, ...tintableMaterialNames(viewer.getState().gltf?.scene)])];
  const setColor = (id: string, patch: Partial<TintColor>) =>
    setConfig(
      { colors: colors.map((color) => (color.id === id ? { ...color, ...patch } : color)) },
      { transient: true },
    );

  return (
    <>
      <Field label={t('settings.tints.label')} orientation="vertical">
        {(id) => (
          <TextInput
            id={id}
            value={label}
            onValueChange={(value) => setConfig({ label: value }, { transient: true })}
            onCommit={commit}
          />
        )}
      </Field>
      <Field label={t('settings.tints.material')} orientation="vertical">
        {(id) => (
          <Select
            id={id}
            label={t('settings.tints.material')}
            value={materials[0] ?? NO_MATERIAL}
            options={[
              { value: NO_MATERIAL, label: t('settings.tints.none') },
              ...names.map((name) => ({ value: name, label: name })),
            ]}
            onValueChange={(name) => setConfig({ materials: name === NO_MATERIAL ? [] : [name] })}
          />
        )}
      </Field>
      <ul className="ds-editor-colors" aria-label={t('settings.tints.colors')}>
        {colors.map((color) => (
          <li key={color.id} className="ds-editor-colors__item">
            <ColorInput
              value={color.color}
              label={t('settings.tints.colorValue')}
              onValueChange={(value) => setColor(color.id, { color: value })}
              onCommit={commit}
            />
            <TextInput
              value={color.label}
              label={t('settings.tints.colorLabel')}
              onValueChange={(value) => setColor(color.id, { label: value })}
              onCommit={commit}
            />
            <IconButton
              label={t('settings.tints.remove', { name: color.label })}
              icon={<Trash2 size={16} aria-hidden="true" />}
              onClick={() => setConfig({ colors: colors.filter((entry) => entry.id !== color.id) })}
            />
          </li>
        ))}
      </ul>
      <Row>
        <Button
          variant="ghost"
          icon={<Plus size={16} aria-hidden="true" />}
          onClick={() =>
            setConfig({
              colors: [
                ...colors,
                {
                  id: nextColorId(colors),
                  label: t('settings.tints.newColor', { number: colors.length + 1 }),
                  color: NEW_COLOR,
                },
              ],
            })
          }
        >
          {t('settings.tints.add')}
        </Button>
      </Row>
    </>
  );
};
