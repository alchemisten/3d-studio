import { FC, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import type { IFeature } from '@alchemisten/3d-studio-viewer-core';

import { ButtonToggle } from '../button-toggle/button-toggle';
import styles from './feature-control.module.scss';

export interface FeatureControlProps {
  feature: IFeature;
}

export const FeatureControl: FC<FeatureControlProps> = ({ feature }) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const subscription = feature.getEnabled().subscribe((enabled) => {
      setActive(enabled);
    });

    return () => {
      subscription.unsubscribe();
    };
  });

  const id = useMemo(() => {
    return String(feature.id).replace('Symbol(', '').replace(')', '');
  }, [feature]);

  return (
    <div className={styles.featureControl}>
      <button type="button" className={styles.label} onClick={() => feature.setEnabled(!active)}>
        <FormattedMessage id={`feature.${id}`} defaultMessage={id} />
      </button>
      <ButtonToggle
        id={`feature-${id}`}
        key={id}
        active={active}
        onClick={() => {
          feature.setEnabled(!active);
        }}
      />
    </div>
  );
};
