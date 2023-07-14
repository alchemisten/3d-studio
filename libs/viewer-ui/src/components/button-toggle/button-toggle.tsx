import { FC } from 'react';
import styles from './button-toggle.module.scss';

export interface ButtonToggleProps {
  active: boolean;
  id?: string;
  onClick: () => void;
}

export const ButtonToggle: FC<ButtonToggleProps> = ({ active, id, onClick }) => {
  return <button type="button" className={`${styles.buttonToggle} ${active ? styles.active : ''}`} onClick={onClick} />;
};
