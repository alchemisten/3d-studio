import React, { FC, PropsWithChildren } from 'react';

import styles from './text-box.module.scss';

export interface TextBoxProps extends PropsWithChildren {
  position: 'intro' | 'highlight' | 'menu';
}

export const TextBox: FC<TextBoxProps> = ({ children, position }) => {
  return <div className={`${styles.textBox} ${styles[position]}`}>{children}</div>;
};
