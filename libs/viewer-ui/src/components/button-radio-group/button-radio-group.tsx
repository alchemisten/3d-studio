import React, { FC } from 'react';
import { FormattedMessage } from 'react-intl';

import styles from './button-radio-group.module.scss';

export interface RadioElement {
  label: string;
  value: string;
}

export interface ButtonRadioGroupProps {
  elements: RadioElement[];
  onChange: (value: string) => void;
  value: string;
}

export const ButtonRadioGroup: FC<ButtonRadioGroupProps> = ({ elements, onChange, value }) => {
  return (
    <>
      {elements.map((element) => (
        <label
          htmlFor={`radio-${element.value}`}
          key={element.value}
          className={`${styles.label} ${value === element.value ? styles.active : ''}`}
        >
          <FormattedMessage id={element.label} />
          <input
            className={`${styles.input}`}
            value={element.value}
            type="radio"
            id={`radio-${element.value}`}
            onChange={() => onChange(element.value)}
            checked={value === element.value}
          />
        </label>
      ))}
    </>
  );
};
