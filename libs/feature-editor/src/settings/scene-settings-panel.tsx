import { Button } from '@schablone/3d-studio-ui';
import { useEditor } from '../editor-context';
import { FieldGroup, Hint, Row, Stack } from '../fields';
import type { SceneSettingsConfig } from './scene-settings-config';
import { SettingsFieldView } from './settings-field';
import { useSceneSettings } from './use-scene-settings';

/** How the scene opens and presents the model: the opening view and the settings of the viewer's features. */
export const SceneSettingsPanel = ({ config }: { config: SceneSettingsConfig }) => {
  const settings = useSceneSettings(config.sections);
  const { t, flush } = useEditor();
  const { openingCamera, sections } = settings;

  return (
    <Stack>
      {config.openingCamera && (
        <FieldGroup card title={t('settings.openingCamera')}>
          <div className="ds-field">
            <span className="ds-field__label">{t('settings.openingCamera.opens')}</span>
            <span className="ds-editor-chip">
              {t(openingCamera ? 'settings.openingCamera.saved' : 'settings.openingCamera.none')}
            </span>
          </div>
          <Row>
            <Button data-testid="ds-editor-opening-capture" onClick={settings.captureOpeningCamera}>
              {t('settings.openingCamera.capture')}
            </Button>
            {openingCamera && (
              <Button variant="ghost" onClick={settings.resetOpeningCamera}>
                {t('settings.openingCamera.reset')}
              </Button>
            )}
          </Row>
        </FieldGroup>
      )}
      {sections.map(({ section, context, setConfig }) => (
        <FieldGroup key={section.featureId} card title={t(section.title)}>
          {section.fields.map((field) => (
            <SettingsFieldView key={field.key} field={field} context={context} setConfig={setConfig} commit={flush} />
          ))}
        </FieldGroup>
      ))}
      {!config.openingCamera && sections.length === 0 && <Hint>{t('settings.empty')}</Hint>}
    </Stack>
  );
};
