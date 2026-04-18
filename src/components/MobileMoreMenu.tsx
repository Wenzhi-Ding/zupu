import { useState, useEffect } from 'react';
import { useDataIO } from '../store/useDataIO';

interface MobileMoreMenuProps {
  onTreeManager: () => void;
  onHelp: () => void;
}

export const MobileMoreMenu: React.FC<MobileMoreMenuProps> = ({ onTreeManager, onHelp }) => {
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
        aria-label="更多操作"
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
          <span className="more-menu-icon">📋</span> 族谱管理
        </button>
        <button
          type="button"
          className="more-menu-item"
          onClick={() => { handleExport(); close(); }}
        >
          <span className="more-menu-icon">📤</span> 导出数据
        </button>
        <button
          type="button"
          className="more-menu-item"
          onClick={() => { handleImport(); close(); }}
        >
          <span className="more-menu-icon">📥</span> 导入数据
        </button>
        <button
          type="button"
          className="more-menu-item"
          onClick={() => { onHelp(); close(); }}
        >
          <span className="more-menu-icon">❓</span> 帮助
        </button>
        <a
          href="https://github.com/Wenzhi-Ding/zupu/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="more-menu-item"
          onClick={close}
        >
          <span className="more-menu-icon">💡</span> 提建议
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
