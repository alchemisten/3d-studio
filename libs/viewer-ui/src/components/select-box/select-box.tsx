import { FC, useState } from 'react';

import styles from './select-box.module.scss';

export interface SelectBoxEntry {
  id: string;
  label: string;
}

export interface SelectBoxProps {
  currentEntry: SelectBoxEntry | null;
  entries: SelectBoxEntry[];
  onEntrySelected: (entry: SelectBoxEntry) => void;
}

export const SelectBox: FC<SelectBoxProps> = ({ currentEntry, entries, onEntrySelected }) => {
  const [listOpen, setListOpen] = useState(false);

  if (entries.length === 0 || !currentEntry) {
    return null;
  }

  const selectNextEntry = () => {
    const currentIndex = entries.findIndex((entry) => entry.id === currentEntry.id);
    onEntrySelected(currentIndex !== entries.length - 1 ? entries[currentIndex + 1] : entries[0]);
  };

  const selectPreviousEntry = () => {
    const currentIndex = entries.findIndex((entry) => entry.id === currentEntry.id);
    onEntrySelected(currentIndex !== 0 ? entries[currentIndex - 1] : entries[entries.length - 1]);
  };

  return (
    <div className={styles.selectBox}>
      {listOpen && (
        <div className={styles.list}>
          {entries.map((entry) => (
            <button className={styles.listEntry} type="button" key={entry.id} onClick={() => onEntrySelected(entry)}>
              {entry.label}
            </button>
          ))}
        </div>
      )}

      <button type="button" className={styles.prev} onClick={selectPreviousEntry}>
        <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.41 16.09l-4.58-4.59 4.58-4.59L14 5.5l-6 6 6 6z"></path>
          <path d="M0-.5h24v24H0z" fill="none"></path>
        </svg>
      </button>

      <button type="button" className={styles.current} onClick={() => setListOpen(!listOpen)}>
        {currentEntry?.label || ''}
      </button>

      <button type="button" className={styles.next} onClick={selectNextEntry}>
        <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z"></path>
          <path d="M0-.25h24v24H0z" fill="none"></path>
        </svg>
      </button>
    </div>
  );
};
