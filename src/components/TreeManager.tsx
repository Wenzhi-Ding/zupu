import React, { useState, useRef } from 'react';
import { useFamilyStore } from '../store/familyStore';
import { SAMPLE_TREES } from '../data/sampleTrees';
import type { Gender } from '../types';
import './TreeManager.css';

interface SearchResult {
  id: string;
  name: string;
}

export const TreeManager: React.FC = () => {
  const showTreeManager = useFamilyStore((s) => s.showTreeManager);
  const setShowTreeManager = useFamilyStore((s) => s.setShowTreeManager);
  const loadSampleData = useFamilyStore((s) => s.loadSampleData);
  const addPerson = useFamilyStore((s) => s.addPerson);
  const setTreeName = useFamilyStore((s) => s.setTreeName);
  const availableTrees = useFamilyStore((s) => s.availableTrees);
  const loadTree = useFamilyStore((s) => s.loadTree);
  const deleteTree = useFamilyStore((s) => s.deleteTree);
  const persons = useFamilyStore((s) => s.persons);
  const currentTree = useFamilyStore((s) => s.currentTree);

  const [newTreeName, setNewTreeName] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonGender, setNewPersonGender] = useState<Gender>('male');

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  if (!showTreeManager) return null;

  const handleSearchInput = (value: string) => {
    setSearchText(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimerRef.current = setTimeout(() => {
      const query = value.trim().toLowerCase();
      const results: SearchResult[] = Object.values(persons)
        .filter((p) => p.name.toLowerCase().includes(query))
        .slice(0, 20)
        .map((p) => ({ id: p.id, name: p.name }));
      setSearchResults(results);
    }, 150);
  };

  const handleSearchSelect = (nameOrId: string | null) => {
    loadTree(nameOrId);
    setSearchText('');
    setSearchResults([]);
    setShowTreeManager(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchText.trim()) {
      handleSearchSelect(searchText.trim());
    }
  };

  const handleLoadSample = (sampleKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const sample = SAMPLE_TREES.find((s) => s.key === sampleKey);
    if (!sample) return;
    const data = sample.getData();
    const treeNameMap: Record<string, string> = {};
    for (const person of Object.values(data.persons)) {
      if (person.parentIds.length === 0) {
        treeNameMap[person.name] = sample.treeName;
        break;
      }
    }
    loadSampleData(data, treeNameMap);
  };

  const handleDeleteTree = (rootName: string, treeName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`确定删除族谱「${treeName}」吗？此操作不可撤销。`)) return;
    deleteTree(rootName);
  };

  const handleCreateTree = () => {
    const personName = newPersonName.trim();
    if (!personName) return;
    addPerson(personName, newPersonGender);
    const treeName = newTreeName.trim();
    if (treeName) {
      setTreeName(personName, treeName);
    }
    setNewTreeName('');
    setNewPersonName('');
    setShowTreeManager(false);
  };

  const handleSelectTree = (treeId: string) => {
    loadTree(treeId);
    setShowTreeManager(false);
  };

  const handleClose = () => {
    setShowTreeManager(false);
  };

  const hasPersons = Object.keys(persons).length > 0;

  const loadedTreeIds = new Set(availableTrees.map((t) => t.id));
  const hasUserData = availableTrees.some(
    (t) => !SAMPLE_TREES.some((s) => s.anchorPersonName === t.id),
  );
  const unloadedSamples = hasUserData
    ? []
    : SAMPLE_TREES.filter((s) => !loadedTreeIds.has(s.anchorPersonName));

  const sampleAnchorNames = new Set(SAMPLE_TREES.map((s) => s.anchorPersonName));

  return (
    <div className="tree-mgr-overlay" role="dialog" aria-modal="true" aria-label="族谱管理">
      <button type="button" className="tree-mgr-backdrop" onClick={handleClose} aria-label="关闭" />
      <div className="tree-mgr-modal">
        <div className="tree-mgr-header">
          <h2>族谱管理</h2>
          <button type="button" className="tree-mgr-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        {hasPersons && (
          <div className="tree-mgr-search-bar">
            <input
              id="tree-mgr-search-input"
              type="text"
              className="tree-mgr-search-input"
              value={searchText}
              onChange={(e) => handleSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="输入姓名搜索族谱…"
            />
            {searchResults.length > 0 && (
              <div className="tree-mgr-search-results">
                {searchResults.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="tree-mgr-search-option"
                    onClick={() => handleSearchSelect(r.name)}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}
            {currentTree && (
              <button
                type="button"
                className="tree-mgr-show-all-btn"
                onClick={() => handleSearchSelect(null)}
              >
                显示全部族谱（当前筛选：{currentTree}）
              </button>
            )}
          </div>
        )}

        <div className="tree-mgr-body">
          {(availableTrees.length > 0 || unloadedSamples.length > 0) && (
            <div className="tree-mgr-section">
              <h3>已有族谱</h3>
              <div className="existing-trees">
                {availableTrees.map((tree) => {
                  const isSample = sampleAnchorNames.has(tree.id);
                  return (
                    <div
                      key={tree.id}
                      className="existing-tree-item"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectTree(tree.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectTree(tree.id); }}
                    >
                      <div className="existing-tree-info">
                        <span className="existing-tree-name">{tree.name}</span>
                        {isSample && <span className="tree-badge-sample">样例</span>}
                      </div>
                      <div className="existing-tree-actions">
                        <span className="existing-tree-count">{tree.count} 人</span>
                        <button
                          type="button"
                          className="tree-delete-btn"
                          onClick={(e) => handleDeleteTree(tree.id, tree.name, e)}
                          title="删除族谱"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
                {unloadedSamples.map((sample) => (
                  <div key={sample.key} className="existing-tree-item existing-tree-item-unloaded">
                    <div className="existing-tree-info">
                      <span className="existing-tree-name">{sample.treeName}</span>
                      <span className="tree-badge-sample">样例</span>
                    </div>
                    <div className="existing-tree-actions">
                      <span className="existing-tree-count">{sample.personCount} 人</span>
                      <button
                        type="button"
                        className="tree-load-btn"
                        onClick={(e) => handleLoadSample(sample.key, e)}
                      >
                        加载
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="tree-mgr-section">
            <h3>新建族谱</h3>
            <p className="tree-mgr-hint">指定一个人物作为起点，并为族谱命名</p>
            <div className="new-tree-form">
              <div className="form-row">
                <label htmlFor="tree-name-input">族谱名称</label>
                <input
                  id="tree-name-input"
                  type="text"
                  value={newTreeName}
                  onChange={(e) => setNewTreeName(e.target.value)}
                  placeholder="例如：王氏家族"
                />
              </div>
              <div className="form-row">
                <label htmlFor="person-name-input">核心人物</label>
                <div className="form-row-inline">
                  <input
                    id="person-name-input"
                    type="text"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    placeholder="姓名"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTree()}
                  />
                  <select
                    value={newPersonGender}
                    onChange={(e) => setNewPersonGender(e.target.value as Gender)}
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                className="new-tree-btn"
                onClick={handleCreateTree}
                disabled={!newPersonName.trim()}
              >
                创建族谱
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
