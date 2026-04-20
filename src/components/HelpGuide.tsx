import { useT } from '../i18n';
import './HelpGuide.css';

interface HelpGuideProps {
  open: boolean;
  onClose: () => void;
}

export const HelpGuide = ({ open, onClose }: HelpGuideProps) => {
  const t = useT();
  if (!open) return null;

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <h2>{t('helpTitle')}</h2>
          <button type="button" className="help-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="help-body">
          <div className="help-section">
            <h3>{t('helpTreeManagerTitle')}</h3>
            <p>{t('helpTreeManagerContent')}</p>
          </div>
          <div className="help-section">
            <h3>{t('helpAddPersonTitle')}</h3>
            <p>{t('helpAddPersonContent')}</p>
          </div>
          <div className="help-section">
            <h3>{t('helpAddRelationTitle')}</h3>
            <p>{t('helpAddRelationContent')}</p>
          </div>
          <div className="help-section">
            <h3>{t('helpEditInfoTitle')}</h3>
            <p>{t('helpEditInfoContent')}</p>
          </div>
          <div className="help-section">
            <h3>{t('helpSelectTitle')}</h3>
            <p>{t('helpSelectContent')}</p>
          </div>
          <div className="help-section">
            <h3>{t('helpRelationChainTitle')}</h3>
            <p>{t('helpRelationChainContent')}</p>
          </div>
          <div className="help-section">
            <h3>{t('helpDataSafetyTitle')}</h3>
            <p>{t('helpDataSafetyContent')}</p>
          </div>
          <div className="help-section">
            <h3>{t('helpImportExportTitle')}</h3>
            <p>{t('helpImportExportContent')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
