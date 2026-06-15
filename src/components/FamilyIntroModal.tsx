import React, { useState, useEffect } from 'react';
import { useFamilyStore } from '../store/familyStore';
import { useT } from '../i18n';
import './FamilyIntroModal.css';

export const FamilyIntroModal: React.FC = () => {
  const familyIntroPersonId = useFamilyStore((s) => s.familyIntroPersonId);
  const familyIntroEditMode = useFamilyStore((s) => s.familyIntroEditMode);
  const persons = useFamilyStore((s) => s.persons);
  const updatePerson = useFamilyStore((s) => s.updatePerson);
  const setFamilyIntroPersonId = useFamilyStore((s) => s.setFamilyIntroPersonId);
  const t = useT();

  const [editText, setEditText] = useState('');

  useEffect(() => {
    if (familyIntroPersonId && familyIntroEditMode) {
      const p = persons[familyIntroPersonId];
      setEditText(p?.familyIntro ?? '');
    }
  }, [familyIntroPersonId, familyIntroEditMode, persons]);

  if (!familyIntroPersonId) return null;
  const person = persons[familyIntroPersonId];
  if (!person) return null;

  const isEditing = familyIntroEditMode;

  const startEdit = () => {
    setEditText(person.familyIntro ?? '');
    setFamilyIntroPersonId(familyIntroPersonId, true);
  };

  const saveEdit = () => {
    updatePerson(person.id, { familyIntro: editText.trim() || undefined });
    setFamilyIntroPersonId(null);
  };

  const cancelEdit = () => {
    setFamilyIntroPersonId(null);
  };

  const handleClose = () => {
    setFamilyIntroPersonId(null);
  };

  return (
    <div className="family-intro-overlay" onClick={handleClose}>
      <div className="family-intro-modal" onClick={(e) => e.stopPropagation()}>
        <div className="family-intro-header">
          <h3>{t('familyIntroTitle')}</h3>
          <button className="family-intro-close" onClick={handleClose}>✕</button>
        </div>
        <div className="family-intro-person-name">{person.name}</div>

        {isEditing ? (
          <>
            <textarea
              className="family-intro-textarea"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder={t('familyIntroPlaceholder')}
              autoFocus
            />
            <div className="family-intro-actions">
              <button className="btn-cancel" onClick={cancelEdit}>{t('cancel')}</button>
              <button className="btn-save" onClick={saveEdit}>{t('save')}</button>
            </div>
          </>
        ) : (
          <>
            <div className="family-intro-content">{person.familyIntro}</div>
            <div className="family-intro-actions">
              <button className="btn-cancel" onClick={handleClose}>{t('close')}</button>
              <button className="btn-edit" onClick={startEdit}>{t('editFamilyIntro')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
