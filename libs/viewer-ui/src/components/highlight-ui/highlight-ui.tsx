import { FC, useEffect, useState } from 'react';
import { HighlightModel, IHighlightFeature } from '@alchemisten/3d-studio-viewer-core';
import { useTranslations } from 'react-intl-provider';
import { Subscription } from 'rxjs';

import { SelectBox, SelectBoxEntry } from '../select-box/select-box';
import { TextBox } from '../text-box/text-box';
import styles from './highlight-ui.module.scss';

export interface HighlightUiProps {
  feature: IHighlightFeature;
}

export const HighlightUi: FC<HighlightUiProps> = ({ feature }) => {
  const { currentLanguage } = useTranslations();
  const [entries, setEntries] = useState<SelectBoxEntry[]>([]);
  const [currentHighlight, setCurrentHighlight] = useState<HighlightModel | null>(null);
  const [currentEntry, setCurrentEntry] = useState<SelectBoxEntry | null>(null);

  const onEntrySelected = (entry: SelectBoxEntry) => {
    feature.focusHighlight(entry.id);
  };

  useEffect(() => {
    const subscription = new Subscription();

    subscription.add(
      feature.getHighlights().subscribe((highlights) => {
        setEntries(
          highlights.map(
            (highlight) =>
              ({
                id: highlight.id,
                label: highlight.i18n[currentLanguage]?.headline || highlight.id,
              } as SelectBoxEntry)
          )
        );
        setCurrentEntry({
          id: highlights[0].id,
          label: highlights[0].i18n[currentLanguage]?.headline || highlights[0].id,
        });
      })
    );

    subscription.add(
      feature.getFocusedHighlight().subscribe((highlight) => {
        setCurrentHighlight(highlight);

        if (highlight) {
          setCurrentEntry({
            id: highlight.id,
            label: highlight.i18n[currentLanguage]?.headline || highlight.id,
          });
        }
      })
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [currentLanguage, feature]);

  return (
    <>
      {currentHighlight && (
        <TextBox position="highlight">
          <div className={styles.highlightHeadline}>{currentHighlight.i18n[currentLanguage]?.headline || ''}</div>
          {currentHighlight.i18n[currentLanguage]?.content && (
            <div className={styles.highlightContent}>{currentHighlight.i18n[currentLanguage].content}</div>
          )}
        </TextBox>
      )}
      <SelectBox currentEntry={currentEntry} entries={entries} onEntrySelected={onEntrySelected} />
    </>
  );
};
