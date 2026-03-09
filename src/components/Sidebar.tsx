import React, { useState } from 'react';
import { useFamilyStore } from '../store/familyStore';
import { RelationEditor } from './RelationEditor';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const selectedId = useFamilyStore((s) => s.selectedPersonId);
  const persons = useFamilyStore((s) => s.persons);
  const updatePerson = useFamilyStore((s) => s.updatePerson);
  const removePerson = useFamilyStore((s) => s.removePerson);
  const selectPerson = useFamilyStore((s) => s.selectPerson);

  const person = selectedId ? persons[selectedId] : null;

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBirthYear, setEditBirthYear] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [editTitle, setEditTitle] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editDeathYear, setEditDeathYear] = useState('');

  if (!person) {
    return null;
  }

  const startEdit = () => {
    setEditName(person.name);
    setEditBirthYear(person.birthYear?.toString() ?? '');
    setEditGender(person.gender);
    setEditTitle(person.title ?? '');
    setEditBio(person.bio ?? '');
    setEditDeathYear(person.deathYear ?? '');
    setEditing(true);
  };

  const saveEdit = () => {
    updatePerson(person.id, {
      name: editName.trim() || person.name,
      birthYear: editBirthYear ? parseInt(editBirthYear, 10) : undefined,
      deathYear: editDeathYear.trim() || undefined,
      gender: editGender,
      title: editTitle.trim() || undefined,
      bio: editBio.trim() || undefined,
    });
    setEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`确定要删除「${person.name}」吗？这会同时断开所有关系。`)) {
      removePerson(person.id);
      selectPerson(null);
    }
  };

  return (
    <>
      <div className="sidebar-backdrop" onClick={() => selectPerson(null)} />
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>{person.name}</h3>
          <button className="close-btn" onClick={() => selectPerson(null)}>
            ✕
          </button>
        </div>

        {editing ? (
          <div className="sidebar-edit">
            <div className="form-group">
              <label>姓名</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>性别</label>
              <select value={editGender} onChange={(e) => setEditGender(e.target.value as 'male' | 'female' | 'unknown')}>
                <option value="male">男</option>
                <option value="female">女</option>
                <option value="unknown">未知</option>
              </select>
            </div>
            <div className="form-group">
              <label>称谓</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="例如 爷爷、外婆"
              />
            </div>
            <div className="form-group">
              <label>出生年份</label>
              <input
                type="number"
                value={editBirthYear}
                onChange={(e) => setEditBirthYear(e.target.value)}
                placeholder="例如 1990"
              />
            </div>
            <div className="form-group">
              <label>卒年</label>
              <input
                type="text"
                value={editDeathYear}
                onChange={(e) => setEditDeathYear(e.target.value)}
                placeholder="例如 2020"
              />
            </div>
            <div className="form-group">
              <label>生平履历</label>
              <textarea
                className="bio-textarea"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="记录生平事迹..."
                rows={5}
              />
            </div>
            <div className="sidebar-actions">
              <button className="btn-confirm" onClick={saveEdit}>保存</button>
              <button className="btn-cancel" onClick={() => setEditing(false)}>取消</button>
            </div>
          </div>
        ) : (
          <>
            <div className="sidebar-info">
              <div className="info-row">
                <span className="info-label">性别</span>
                <span>{person.gender === 'male' ? '男 ♂' : person.gender === 'female' ? '女 ♀' : '未知'}</span>
              </div>
              {person.title && (
                <div className="info-row">
                  <span className="info-label">称谓</span>
                  <span>{person.title}</span>
                </div>
              )}
              {person.birthYear && (
                <div className="info-row">
                  <span className="info-label">出生年份</span>
                  <span>{person.birthYear}</span>
                </div>
              )}
              <div className="info-row">
                <span className="info-label">第几代</span>
                <span>第 {person.generation} 代</span>
              </div>
              {person.deathYear && (
                <div className="info-row">
                  <span className="info-label">卒年</span>
                  <span>{person.deathYear}</span>
                </div>
              )}
            </div>

            {person.bio && (
              <div className="bio-section">
                <div className="bio-label">生平履历</div>
                <div className="bio-content">{person.bio}</div>
              </div>
            )}

            <div className="sidebar-relations">
              <RelationEditor
                personId={person.id}
                relationType="parent"
                label="父母"
                currentIds={person.parentIds}
              />
              <RelationEditor
                personId={person.id}
                relationType="spouse"
                label="配偶"
                currentIds={person.spouseIds}
              />
              <RelationEditor
                personId={person.id}
                relationType="child"
                label="子女"
                currentIds={person.childrenIds}
              />
            </div>

            <div className="sidebar-actions">
              <button className="btn-edit" onClick={startEdit}>编辑</button>
              <button className="btn-delete" onClick={handleDelete}>删除</button>
            </div>
          </>
        )}
      </div>
    </>
  );
};
