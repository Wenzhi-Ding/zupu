import React, { useState } from 'react';
import { useT } from '../i18n';
import './PrivacyBanner.css';

export const PrivacyBanner: React.FC = () => {
  const t = useT();
  const [visible, setVisible] = useState(
    () => localStorage.getItem('genealogy_privacy_dismissed') !== 'true',
  );

  const handleDismiss = () => {
    localStorage.setItem('genealogy_privacy_dismissed', 'true');
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="privacy-banner">
      <span>{t('privacyMessage')}</span>
      <button type="button" className="privacy-dismiss-btn" onClick={handleDismiss}>
        {t('gotIt')}
      </button>
    </div>
  );
};
