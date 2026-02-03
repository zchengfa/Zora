import React from 'react';
import styles from '@styles/components/ZoraOnlineStatus.module.scss';
import { useAppTranslation } from '@hooks/useAppTranslation.ts';

interface ZoraOnlineStatusProps {
  isOnline?: boolean;
}

const ZoraOnlineStatus: React.FC<ZoraOnlineStatusProps> = ({ isOnline = true }) => {
  const { translation } = useAppTranslation();
  const ct = translation.components.chat;

  return (
    <div className={styles.statusContainer}>
      <div className={`${styles.statusIndicator} ${isOnline ? styles.online : styles.offline}`}>
        <span className={styles.statusDot}></span>
        <span className={styles.statusText}>
          {isOnline ? ct.onlineStatus.online : ct.onlineStatus.offline}
        </span>
      </div>
    </div>
  );
};

export default ZoraOnlineStatus;
