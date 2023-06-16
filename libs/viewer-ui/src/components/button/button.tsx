import React, { FC, PropsWithChildren } from 'react';
import styles from './button.module.scss';

export interface ButtonProps extends PropsWithChildren {
  onClick: () => void;
}

export const Button: FC<ButtonProps> = ({ children, onClick }) => {
  return (
    <button className={styles.button} onClick={onClick}>
      {children}
    </button>
  );
};
