import { useRef } from 'react';
import { useFamilyStore } from './familyStore';
import { exportData, importData, saveLocalDataImmediate } from './localDb';

export function useDataIO() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const state = useFamilyStore.getState();
    const json = exportData({
      persons: state.persons,
      siblingOrder: state.siblingOrder,
      spouseOrder: state.spouseOrder,
      selectedPersonId: state.selectedPersonId,
      currentTree: state.currentTree,
      treeNames: state.treeNames,
    });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '族谱数据.json';
    a.click();
    URL.revokeObjectURL(url);
    state.markExported();
  };

  const handleImport = () => {
    if (!window.confirm('导入将覆盖当前所有数据，确定继续吗？')) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = importData(reader.result as string);
        const importState = { ...data, currentTree: null as string | null };
        useFamilyStore.setState({
          ...importState,
          _hydrated: true,
          _dirtyAfterExport: false,
          availableTrees: [],
          anchorPersonId: null,
          relationMode: false,
          relationPickedIds: [],
          relationPath: null,
          showTreeManager: false,
        });
        saveLocalDataImmediate(importState);
        useFamilyStore.getState().fetchTrees();
      } catch {
        alert('导入失败：文件格式不正确');
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return { fileInputRef, handleExport, handleImport, handleFileChange };
}
