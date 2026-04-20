import { useState, useEffect } from 'react';
import { useT } from '../i18n';
import { useDataIO } from '../store/useDataIO';

interface MobileMoreMenuProps {
  onTreeManager: () => void;
  onHelp: () => void;
}

export const MobileMoreMenu: React.FC<MobileMoreMenuProps> = ({ onTreeManager, onHelp }) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { fileInputRef, handleExport, handleImport, handleFileChange } = useDataIO();

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 640) setOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const close = () => setOpen(false);

  return (
    <div className="mobile-extra">
      <button
        type="button"
        className="mobile-more-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('moreActions')}
      >
        ⋯
      </button>
      {open && (
        <div className="more-menu-backdrop" onClick={close} />
      )}
      <div className={`more-menu ${open ? 'open' : ''}`}>
        <button
          type="button"
          className="more-menu-item"
          onClick={() => { onTreeManager(); close(); }}
        >
          <span className="more-menu-icon">📋</span> {t('treeManager')}
        </button>
        <button
          type="button"
          className="more-menu-item"
          onClick={() => { handleExport(); close(); }}
        >
          <span className="more-menu-icon">📤</span> {t('exportData')}
        </button>
        <button
          type="button"
          className="more-menu-item"
          onClick={() => { handleImport(); close(); }}
        >
          <span className="more-menu-icon">📥</span> {t('importData')}
        </button>
        <button
          type="button"
          className="more-menu-item"
          onClick={() => { onHelp(); close(); }}
        >
          <span className="more-menu-icon">❓</span> {t('help')}
        </button>
        <a
          href="https://github.com/Wenzhi-Ding/zupu/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="more-menu-item"
          onClick={close}
        >
          <span className="more-menu-icon">💡</span> {t('feedback')}
        </a>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};
