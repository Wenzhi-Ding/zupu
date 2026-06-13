import { useRef } from 'react';
import JSZip from 'jszip';
import { useFamilyStore } from './familyStore';
import { importData, extractImageMeta, saveLocalDataImmediate } from './localDb';
import {
  getAllImagesForExport,
  bulkImportImages,
  clearAllImages,
} from './imageDb';
import type { ImageMeta } from '../types';

function getExportFileName(): string {
  return '族谱数据.zip';
}

export function useDataIO() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const state = useFamilyStore.getState();
    const baseData = {
      persons: state.persons,
      siblingOrder: state.siblingOrder,
      spouseOrder: state.spouseOrder,
      selectedPersonId: state.selectedPersonId,
      currentTree: state.currentTree,
      treeNames: state.treeNames,
    };

    const allImages = await getAllImagesForExport();
    const imagesMeta: Record<string, ImageMeta> = {};
    for (const img of allImages) {
      imagesMeta[img.id] = {
        id: img.id,
        personId: img.personId,
        format: img.format,
        kind: img.kind,
      };
    }

    const exportPayload = { ...baseData, images: imagesMeta };
    const jsonStr = JSON.stringify(exportPayload, null, 2);

    const zip = new JSZip();
    zip.file('data.json', jsonStr);

    for (const img of allImages) {
      const path = `images/${img.personId}/${img.id}.${img.format}`;
      zip.file(path, img.blob);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getExportFileName();
    a.click();
    URL.revokeObjectURL(url);
    state.markExported();
  };

  const handleImport = () => {
    if (!window.confirm('导入将覆盖当前所有数据，确定继续吗？')) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        const jsonFile = zip.file('data.json');
        if (!jsonFile) throw new Error('Zip missing data.json');

        const jsonStr = await jsonFile.async('string');
        const data = importData(jsonStr);

        await clearAllImages();

        const parsed = JSON.parse(jsonStr);
        const imagesMeta = extractImageMeta(parsed);

        if (imagesMeta) {
          const entries: Array<{ id: string; personId: string; blob: Blob; format: string; kind: 'avatar' | 'gallery' }> = [];
          for (const meta of Object.values(imagesMeta)) {
            const path = `images/${meta.personId}/${meta.id}.${meta.format}`;
            const imgFile = zip.file(path);
            if (imgFile) {
              const blob = await imgFile.async('blob');
              entries.push({
                id: meta.id,
                personId: meta.personId,
                blob,
                format: meta.format,
                kind: meta.kind,
              });
            }
          }
          await bulkImportImages(entries);
        }

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
      } else {
        await clearAllImages();
        const text = await file.text();
        const data = importData(text);
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
      }
    } catch {
      alert('导入失败：文件格式不正确');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return { fileInputRef, handleExport, handleImport, handleFileChange };
}
