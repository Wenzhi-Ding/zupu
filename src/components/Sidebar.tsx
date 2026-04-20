import React, { useState } from 'react';
import { useFamilyStore } from '../store/familyStore';
import { RelationEditor } from './RelationEditor';
import { useT } from '../i18n';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const selectedId = useFamilyStore((s) => s.selectedPersonId);
  const persons = useFamilyStore((s) => s.persons);
  const updatePerson = useFamilyStore((s) => s.updatePerson);
  const removePerson = useFamilyStore((s) => s.removePerson);
  const selectPerson = useFamilyStore((s) => s.selectPerson);

  const t = useT();

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
    if (window.confirm(t('confirmDelete', { name: person.name }))) {
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
              <label>{t('name')}</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('gender')}</label>
              <select value={editGender} onChange={(e) => setEditGender(e.target.value as 'male' | 'female' | 'unknown')}>
                <option value="male">{t('male')}</option>
                <option value="female">{t('female')}</option>
                <option value="unknown">{t('unknown')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('title')}</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder={t('titlePlaceholder')}
              />
            </div>
            <div className="form-group">
              <label>{t('birthYear')}</label>
              <input
                type="number"
                value={editBirthYear}
                onChange={(e) => setEditBirthYear(e.target.value)}
                placeholder={t('birthYearPlaceholder')}
              />
            </div>
            <div className="form-group">
              <label>{t('deathYear')}</label>
              <input
                type="text"
                value={editDeathYear}
                onChange={(e) => setEditDeathYear(e.target.value)}
                placeholder={t('deathYearPlaceholder')}
              />
            </div>
            <div className="form-group">
              <label>{t('bio')}</label>
              <textarea
                className="bio-textarea"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder={t('bioPlaceholder')}
                rows={5}
              />
            </div>
            <div className="sidebar-actions">
              <button className="btn-confirm" onClick={saveEdit}>{t('save')}</button>
              <button className="btn-cancel" onClick={() => setEditing(false)}>{t('cancel')}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="sidebar-info">
              <div className="info-row">
                <span className="info-label">{t('gender')}</span>
                <span>{person.gender === 'male' ? t('maleSymbol') : person.gender === 'female' ? t('femaleSymbol') : t('unknown')}</span>
              </div>
              {person.title && (
                <div className="info-row">
                  <span className="info-label">{t('title')}</span>
                  <span>{person.title}</span>
                </div>
              )}
              {person.birthYear && (
                <div className="info-row">
                  <span className="info-label">{t('birthYear')}</span>
                  <span>{person.birthYear}</span>
                </div>
              )}
              <div className="info-row">
                <span className="info-label">{t('generation')}</span>
                <span>{t('generationValue', { gen: person.generation })}</span>
              </div>
              {person.deathYear && (
                <div className="info-row">
                  <span className="info-label">{t('deathYear')}</span>
                  <span>{person.deathYear}</span>
                </div>
              )}
            </div>

            {person.bio && (
              <div className="bio-section">
                <div className="bio-label">{t('bio')}</div>
                <div className="bio-content">{person.bio}</div>
              </div>
            )}

            <div className="sidebar-relations">
              <RelationEditor
                personId={person.id}
                relationType="parent"
                label={t('parents')}
                currentIds={person.parentIds}
              />
              <RelationEditor
                personId={person.id}
                relationType="spouse"
                label={t('spouse')}
                currentIds={person.spouseIds}
              />
              <RelationEditor
                personId={person.id}
                relationType="child"
                label={t('children')}
                currentIds={person.childrenIds}
              />
            </div>

            <div className="sidebar-actions">
              <button className="btn-edit" onClick={startEdit}>{t('edit')}</button>
              <button className="btn-delete" onClick={handleDelete}>{t('delete')}</button>
            </div>
          </>
        )}
      </div>
    </>
  );
};
