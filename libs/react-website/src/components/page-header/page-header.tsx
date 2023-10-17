import { FC } from 'react';
import { useConfigContext } from '../../provider';
import styles from './page-header.module.scss';

export interface PageHeaderProps {
  alt?: string;
  logo?: string;
  onSidebarToggle: () => void;
}

export const PageHeader: FC<PageHeaderProps> = ({ alt, logo, onSidebarToggle }) => {
  const { baseUrl } = useConfigContext();

  return (
    <header className={styles.pageHeader}>
      <button type="button" className={styles.button} onClick={onSidebarToggle}>
        <svg x="0px" y="0px" viewBox="0 0 423.9 400.4">
          <circle cx="212.5" cy="201.5" r="175.5" fill="currentColor" />
          <path
            d="M241.2,99v17.4c0,4.3-3.3,7.6-7.6,7.6H123.8c-4.3,0-8.7,4.3-8.7,8.7V161c0,4.3,4.3,8.7,8.7,8.7h109.8  c4.3,0,7.6,3.3,7.6,7.6v18.5c0,5.4,5.4,7.6,9.8,4.3l56.6-46.8c3.3-3.3,3.3-8.7,0-12L251,94.7C246.7,91.4,241.2,94.7,241.2,99z"
            fill="#fff"
          />
          <path
            d="M183.6,202.3v17.4c0,4.3,3.3,7.6,7.6,7.6H301c4.3,0,8.7,4.3,8.7,8.7v28.3c0,4.3-4.3,8.7-8.7,8.7H191.2  c-4.3,0-7.6,3.3-7.6,7.6v18.5c0,5.4-5.4,7.6-9.8,4.3l-56.6-46.8c-3.3-3.3-3.3-8.7,0-12l56.6-46.8C178.1,194.7,183.6,198,183.6,202.3  z"
            fill="#fff"
          />
        </svg>
      </button>
      <h1 className={styles.headline}>3D Dashboard</h1>
      <div className={styles.logo}>{logo && <img src={`${baseUrl}${logo}`} alt={alt} />}</div>
    </header>
  );
};
