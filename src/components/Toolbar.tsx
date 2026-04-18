import React, { useState } from 'react';
import { useFamilyStore } from '../store/familyStore';
import type { Gender } from '../types';
import './Toolbar.css';

export const Toolbar: React.FC = () => {
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
    if (personCount > 0 && !window.confirm('确定要清空所有数据吗？')) return;
    reset();
  };

  const getRelationHint = () => {
    if (relationPickedIds.length === 0) return '请点选第一个人物';
    if (relationPickedIds.length === 1) {
      const name = persons[relationPickedIds[0]]?.name ?? '';
      return `已选：${name}，请点选第二个人物`;
    }
    if (relationPickedIds.length === 2) {
      const nameA = persons[relationPickedIds[0]]?.name ?? '';
      const nameB = persons[relationPickedIds[1]]?.name ?? '';
      if (relationPath === null) return `${nameA} 与 ${nameB} 之间无关系`;
      return `${nameA} → ${nameB}（经过 ${relationPath.length} 人），点选新人物可重新查找`;
    }
    return null;
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <h1 className="app-title">族谱</h1>
        <span className="person-count">{personCount} 人</span>
        {currentTree && (
          <span className="current-tree-label">
            {currentTree}
            <button type="button" className="show-all-btn" onClick={() => loadTree(null)}>
              显示全部
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
            退出关系查看
          </button>
        ) : selectMode ? (
          <>
            <span className="select-mode-hint">
              {selectedIds.length > 0 ? `已选 ${selectedIds.length} 人` : '点击或框选卡片'}
            </span>
            <button className="toolbar-btn active" onClick={toggleSelectMode}>
              退出范围选择
            </button>
          </>
        ) : showNewPerson ? (
          <div className="inline-form">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="姓名"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddRoot()}
            />
            <select value={newGender} onChange={(e) => setNewGender(e.target.value as Gender)}>
              <option value="male">男</option>
              <option value="female">女</option>
            </select>
            <button className="toolbar-btn primary" onClick={handleAddRoot}>
              添加
            </button>
            <button className="toolbar-btn" onClick={() => setShowNewPerson(false)}>
              取消
            </button>
          </div>
        ) : (
          <>
            <button className="toolbar-btn primary" onClick={() => setShowNewPerson(true)}>
              + 新建人物
            </button>
            <button className="toolbar-btn" onClick={toggleSelectMode}>
              范围选择
            </button>
            <button className="toolbar-btn" onClick={toggleRelationMode}>
              展示关系
            </button>
            <button className="toolbar-btn danger" onClick={handleReset}>
              清空
            </button>
          </>
        )}
      </div>
    </div>
  );
};
