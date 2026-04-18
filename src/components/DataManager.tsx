import { useDataIO } from '../store/useDataIO';
import './DataManager.css';

export const DataManager = () => {
  const { fileInputRef, handleExport, handleImport, handleFileChange } = useDataIO();

  return (
    <div className="data-manager">
      <button type="button" className="data-mgr-btn" onClick={handleExport}>
        导出数据
      </button>
      <button type="button" className="data-mgr-btn" onClick={handleImport}>
        导入数据
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
