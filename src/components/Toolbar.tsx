import React, { useState } from 'react';
import { useFamilyStore } from '../store/familyStore';
import { useT, useI18n } from '../i18n';
import type { Gender } from '../types';
import './Toolbar.css';

export const Toolbar: React.FC<{ mobileExtra?: React.ReactNode }> = ({ mobileExtra }) => {
  const reset = useFamilyStore((s) => s.reset);
  const addPerson = useFamilyStore((s) => s.addPerson);
  const personCount = useFamilyStore((s) => Object.keys(s.persons).length);
  const relationMode = useFamilyStore((s) => s.relationMode);
  const toggleRelationMode = useFamilyStore((s) => s.toggleRelationMode);
  const relationPickedIds = useFamilyStore((s) => s.relationPickedIds);
  const relationPath = useFamilyStore((s) => s.relationPath);
  const persons = useFamilyStore((s) => s.persons);
  const currentTree = useFamilyStore((s) => s.currentTree);
  const loadTree = useFamilyStore((s) => s.loadTree);
  const selectMode = useFamilyStore((s) => s.selectMode);
  const selectedIds = useFamilyStore((s) => s.selectedIds);
  const toggleSelectMode = useFamilyStore((s) => s.toggleSelectMode);
  const t = useT();

  const [showNewPerson, setShowNewPerson] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender>('male');

  const handleAddRoot = () => {
    if (!newName.trim()) return;
    addPerson(newName.trim(), newGender);
    setNewName('');
    setShowNewPerson(false);
  };

  const handleReset = () => {
    if (personCount > 0 && !window.confirm(t('confirmClear'))) return;
    reset();
  };

  const getRelationHint = () => {
    if (relationPickedIds.length === 0) return t('relationHint1');
    if (relationPickedIds.length === 1) {
      const name = persons[relationPickedIds[0]]?.name ?? '';
      return t('relationHint2', { name });
    }
    if (relationPickedIds.length === 2) {
      const nameA = persons[relationPickedIds[0]]?.name ?? '';
      const nameB = persons[relationPickedIds[1]]?.name ?? '';
      if (relationPath === null) return t('relationNoPath', { nameA, nameB });
      return t('relationPathFound', { nameA, nameB, count: relationPath.length });
    }
    return null;
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <h1 className="app-title">{t('appTitle')}</h1>
        <span className="person-count">{t('personCount', { count: personCount })}</span>
        {currentTree && (
          <span className="current-tree-label">
            {currentTree}
            <button type="button" className="show-all-btn" onClick={() => loadTree(null)}>
              {t('showAll')}
            </button>
          </span>
        )}
        {relationMode && (
          <span className="relation-hint">{getRelationHint()}</span>
        )}
      </div>

      <div className="toolbar-right">
        {relationMode ? (
          <button className="toolbar-btn active" onClick={toggleRelationMode}>
            {t('exitRelationView')}
          </button>
        ) : selectMode ? (
          <>
            <span className="select-mode-hint">
              {selectedIds.length > 0 ? t('selectModeHintCount', { count: selectedIds.length }) : t('selectModeHintZero')}
            </span>
            <button className="toolbar-btn active" onClick={toggleSelectMode}>
              {t('exitSelectMode')}
            </button>
          </>
        ) : showNewPerson ? (
          <div className="inline-form">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('namePlaceholder')}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddRoot()}
            />
            <select value={newGender} onChange={(e) => setNewGender(e.target.value as Gender)}>
              <option value="male">{t('male')}</option>
              <option value="female">{t('female')}</option>
            </select>
            <button className="toolbar-btn primary" onClick={handleAddRoot}>
              {t('add')}
            </button>
            <button className="toolbar-btn" onClick={() => setShowNewPerson(false)}>
              {t('cancel')}
            </button>
          </div>
        ) : (
          <>
            <button className="toolbar-btn primary" onClick={() => setShowNewPerson(true)}>
              {t('addPerson')}
            </button>
            <button className="toolbar-btn" onClick={toggleSelectMode}>
              {t('selectRange')}
            </button>
            <button className="toolbar-btn" onClick={toggleRelationMode}>
              {t('showRelation')}
            </button>
            <button className="toolbar-btn danger" onClick={handleReset}>
              {t('clear')}
            </button>
          </>
        )}
        {mobileExtra}
      </div>
    </div>
  );
};
