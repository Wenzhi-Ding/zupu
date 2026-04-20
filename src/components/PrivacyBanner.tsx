import React, { useState, useEffect } from 'react';
import { useT } from '../i18n';
import './PrivacyBanner.css';

export const PrivacyBanner: React.FC = () => {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('genealogy_privacy_dismissed');
    if (dismissed !== 'true') {
      setVisible(true);
    }
  }, []);

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
