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
import './App.css';

function App() {
  const [helpOpen, setHelpOpen] = useState(false);
  const setShowTreeManager = useFamilyStore((s) => s.setShowTreeManager);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (useFamilyStore.getState()._dirtyAfterExport) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

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
              族谱管理
            </button>
            <DataManager />
            <button
              type="button"
              className="toolbar-btn help-btn"
              onClick={() => setHelpOpen(true)}
            >
              帮助
            </button>
            <a
              href="https://github.com/Wenzhi-Ding/zupu/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="toolbar-btn suggest-btn"
            >
              提建议
            </a>
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
