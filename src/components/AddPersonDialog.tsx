import React, { useState } from 'react';
import type { RelationType, Gender } from '../types';
import { useFamilyStore } from '../store/familyStore';
import { useT } from '../i18n';
import './AddPersonDialog.css';

interface Props {
  targetPersonId: string;
  onClose: () => void;
}

const RELATION_OPTIONS: { value: RelationType; labelKey: string; defaultGender: Gender }[] = [
  { value: 'father', labelKey: 'father', defaultGender: 'male' },
  { value: 'mother', labelKey: 'mother', defaultGender: 'female' },
  { value: 'son', labelKey: 'son', defaultGender: 'male' },
  { value: 'daughter', labelKey: 'daughter', defaultGender: 'female' },
  { value: 'husband', labelKey: 'husband', defaultGender: 'male' },
  { value: 'wife', labelKey: 'wife', defaultGender: 'female' },
];

export const AddPersonDialog: React.FC<Props> = ({ targetPersonId, onClose }) => {
  const [relationType, setRelationType] = useState<RelationType>('son');
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const addRelation = useFamilyStore((s) => s.addRelation);
  const targetPerson = useFamilyStore((s) => s.persons[targetPersonId]);
  const t = useT();

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
        <h3>{t('addRelativeTitle', { name: targetPerson.name })}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('relationType')}</label>
            <div className="relation-buttons">
              {RELATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`relation-btn ${relationType === opt.value ? 'active' : ''}`}
                  onClick={() => setRelationType(opt.value)}
                >
                  {t(opt.labelKey as any)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>{t('name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('enterName')}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>{t('birthYearOptional')}</label>
            <input
              type="number"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder={t('birthYearPlaceholder')}
            />
          </div>

          <div className="dialog-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn-confirm" disabled={!name.trim()}>
              {t('confirmAdd')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
