import { useT } from '../i18n';
import { useDataIO } from '../store/useDataIO';
import './DataManager.css';

export const DataManager = () => {
  const t = useT();
  const { fileInputRef, handleExport, handleImport, handleFileChange } = useDataIO();

  return (
    <div className="data-manager">
      <button type="button" className="data-mgr-btn" onClick={handleExport}>
        {t('exportData')}
      </button>
      <button type="button" className="data-mgr-btn" onClick={handleImport}>
        {t('importData')}
      </button>
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
