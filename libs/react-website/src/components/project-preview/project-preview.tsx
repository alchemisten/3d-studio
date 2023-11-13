import { FC } from 'react';
import { NavLink } from 'react-router-dom';

import styles from './project-preview.module.scss';
import { useConfigContext } from '../../provider';

export interface ProjectPreviewProps {
  slug: string;
  title: string;
  image?: string;
  onSelect: () => void;
  selected?: boolean;
}

export const ProjectPreview: FC<ProjectPreviewProps> = ({ image, onSelect, selected, slug, title }) => {
  const { baseUrl } = useConfigContext();

  return (
    <div className={styles.projectPreview}>
      <div className={styles.image}>
        <div className={styles.title}>{title}</div>
        {image && (
          <NavLink to={`view/${slug}`}>
            <img src={`${baseUrl}/projects/${slug}/${image}`} alt={title} />
          </NavLink>
        )}
      </div>
      <div className={styles.controls}>
        <button
          type="button"
          className={`${styles.selectButton} ${selected ? styles.selected : ''}`}
          onClick={() => onSelect()}
        />

        <NavLink className={`button ${styles.button}`} to={`view/${slug}`}>
          Ansehen
        </NavLink>
      </div>
    </div>
  );
};
