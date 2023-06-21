import { FC } from 'react';
import { FormattedMessage } from 'react-intl';

import styles from './loading-indicator.module.scss';

export const LoadingIndicator: FC = () => {
  return (
    <div className="loadingIndicator">
      <h2 className={styles.title}>
        <FormattedMessage id="loading" />
      </h2>
      <div className={styles.bar}>
        <div className={styles.indeterminate} />
      </div>
    </div>
  );
};
