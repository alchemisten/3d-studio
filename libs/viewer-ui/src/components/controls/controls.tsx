import { FC, useMemo, useState } from 'react';
import { useTranslations } from 'react-intl-provider';

import type { FeatureMap } from '../../types';
import { Button } from '../button/button';
import { ButtonRadioGroup } from '../button-radio-group/button-radio-group';
import { TextBox } from '../text-box/text-box';
import { FeatureControl } from '../feature-control/feature-control';
import styles from './controls.module.scss';

export interface ControlsProps {
  features: FeatureMap;
}

export const Controls: FC<ControlsProps> = ({ features }) => {
  const { currentLanguage, setLanguage, translations } = useTranslations();
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [featureMenuOpen, setFeatureMenuOpen] = useState(false);

  const featureMenuClicked = () => {
    setLanguageMenuOpen(false);
    setFeatureMenuOpen(!featureMenuOpen);
  };

  const languageMenuClicked = () => {
    setFeatureMenuOpen(false);
    setLanguageMenuOpen(!languageMenuOpen);
  };

  const hasFeatures = useMemo(() => Object.values(features).length > 0, [features]);

  return (
    <div className={styles.controls}>
      <Button onClick={languageMenuClicked}>{currentLanguage}</Button>
      {languageMenuOpen && (
        <TextBox position="menu">
          <ButtonRadioGroup
            elements={Object.keys(translations).map((key) => {
              return { value: key, label: `language.${key}` };
            })}
            onChange={setLanguage}
            value={currentLanguage}
          />
        </TextBox>
      )}

      {hasFeatures && (
        <>
          <Button onClick={featureMenuClicked}>
            <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 0h24v24H0z" fill="none"></path>
              <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"></path>
            </svg>
          </Button>
          {featureMenuOpen && (
            <TextBox position="menu">
              {Object.values(features).map((feature) => {
                return <FeatureControl feature={feature} key={String(feature.id)} />;
              })}
            </TextBox>
          )}
        </>
      )}
    </div>
  );
};
