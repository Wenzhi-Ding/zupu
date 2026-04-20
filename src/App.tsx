import { useEffect, useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { FamilyTree } from './components/FamilyTree';
import { Sidebar } from './components/Sidebar';
import { DataManager } from './components/DataManager';
import { PrivacyBanner } from './components/PrivacyBanner';
import { HelpGuide } from './components/HelpGuide';
import { TreeManager } from './components/TreeManager';
import { MobileMoreMenu } from './components/MobileMoreMenu';
import { useFamilyStore } from './store/familyStore';
import { useT, useI18n } from './i18n';
import './App.css';

function App() {
  const [helpOpen, setHelpOpen] = useState(false);
  const setShowTreeManager = useFamilyStore((s) => s.setShowTreeManager);
  const t = useT();
  const { locale, setLocale } = useI18n();

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (useFamilyStore.getState()._dirtyAfterExport) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    document.title = t('appTitle');
  }, [t]);

  return (
    <div className="app">
      <PrivacyBanner />
      <div className="toolbar-row">
        <Toolbar mobileExtra={
          <MobileMoreMenu
            onTreeManager={() => setShowTreeManager(true)}
            onHelp={() => setHelpOpen(true)}
          />
        } />
        <div className="toolbar-extras-wrapper">
          <div className="toolbar-extras">
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => setShowTreeManager(true)}
            >
              {t('treeManager')}
            </button>
            <DataManager />
            <button
              type="button"
              className="toolbar-btn help-btn"
              onClick={() => setHelpOpen(true)}
            >
              {t('help')}
            </button>
            <a
              href="https://github.com/Wenzhi-Ding/zupu/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="toolbar-btn suggest-btn"
            >
              {t('feedback')}
            </a>
            <button
              type="button"
              className="toolbar-btn lang-btn"
              onClick={() => {
                const newLocale = locale === 'zh' ? 'en' : 'zh';
                setLocale(newLocale);
                useFamilyStore.getState().reset();
                useFamilyStore.getState().setShowTreeManager(true);
              }}
              title={locale === 'zh' ? 'Switch to English' : '切换到中文'}
            >
              {locale === 'zh' ? t('langEn') : t('langZh')}
            </button>
          </div>
        </div>
      </div>
      <div className="app-body">
        <FamilyTree />
        <Sidebar />
      </div>
      <HelpGuide open={helpOpen} onClose={() => setHelpOpen(false)} />
      <TreeManager />
    </div>
  );
}

export default App;
