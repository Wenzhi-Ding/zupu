import React, { useState } from 'react';
import type { RelationType, Gender } from '../types';
import { useFamilyStore } from '../store/familyStore';
import './AddPersonDialog.css';

interface Props {
  targetPersonId: string;
  onClose: () => void;
}

const RELATION_OPTIONS: { value: RelationType; label: string; defaultGender: Gender }[] = [
  { value: 'father', label: '父亲', defaultGender: 'male' },
  { value: 'mother', label: '母亲', defaultGender: 'female' },
  { value: 'son', label: '儿子', defaultGender: 'male' },
  { value: 'daughter', label: '女儿', defaultGender: 'female' },
  { value: 'husband', label: '丈夫', defaultGender: 'male' },
  { value: 'wife', label: '妻子', defaultGender: 'female' },
];

export const AddPersonDialog: React.FC<Props> = ({ targetPersonId, onClose }) => {
  const [relationType, setRelationType] = useState<RelationType>('son');
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const addRelation = useFamilyStore((s) => s.addRelation);
  const targetPerson = useFamilyStore((s) => s.persons[targetPersonId]);

  if (!targetPerson) return null;

  const selectedOption = RELATION_OPTIONS.find((o) => o.value === relationType)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const by = birthYear ? parseInt(birthYear, 10) : undefined;
    addRelation(targetPersonId, relationType, name.trim(), selectedOption.defaultGender, by);
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>为「{targetPerson.name}」添加亲属</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>关系类型</label>
            <div className="relation-buttons">
              {RELATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`relation-btn ${relationType === opt.value ? 'active' : ''}`}
                  onClick={() => setRelationType(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入姓名"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>出生年份（可选）</label>
            <input
              type="number"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder="例如 1990"
            />
          </div>

          <div className="dialog-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn-confirm" disabled={!name.trim()}>
              确认添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
