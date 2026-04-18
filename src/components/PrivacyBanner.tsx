import React, { useState, useEffect } from 'react';
import './PrivacyBanner.css';

export const PrivacyBanner: React.FC = () => {
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
      <span>您的所有族谱数据保存在浏览器本地存储（localStorage）中，不会上传到任何服务器。同域名下的浏览器扩展或脚本可能访问此数据。请定期使用"导出数据"功能备份。</span>
      <button type="button" className="privacy-dismiss-btn" onClick={handleDismiss}>
        知道了
      </button>
    </div>
  );
};
