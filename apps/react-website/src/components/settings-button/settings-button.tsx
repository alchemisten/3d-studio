import { FC } from 'react';
import styles from './settings-button.module.scss';

export interface SettingsButtonProps {
  canBeUndefined?: boolean;
  setting?: boolean;
  setValue: (value?: boolean) => void;
}

export const SettingsButton: FC<SettingsButtonProps> = ({ canBeUndefined = false, setting, setValue }) => {
  return (
    <div className={styles.settingsButton}>
      <button
        type="button"
        className={`button ${styles.buttonLeft} ${setting === true ? styles.active : ''}`}
        onClick={() => setValue(true)}
      >
        On
      </button>
      {canBeUndefined && (
        <button
          type="button"
          className={`button ${styles.buttonCenter} ${setting === undefined ? styles.active : ''}`}
          onClick={() => setValue()}
        >
          Def
        </button>
      )}
      <button
        type="button"
        className={`button ${styles.buttonRight} ${setting === false ? styles.active : ''}`}
        onClick={() => setValue(false)}
      >
        Off
      </button>
    </div>
  );
};
