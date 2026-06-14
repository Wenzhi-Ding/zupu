import React, { useState, useRef } from 'react';
import { useFamilyStore } from '../store/familyStore';
import { RelationEditor } from './RelationEditor';
import { useT } from '../i18n';
import { useAvatarUrl } from '../hooks/useImageUrl';
import { CropModal } from './CropModal';
import { GalleryModal } from './GalleryModal';
import type { CalendarType } from '../types';
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
  const [editBirthMonth, setEditBirthMonth] = useState('');
  const [editBirthDay, setEditBirthDay] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [editTitle, setEditTitle] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editDeathYear, setEditDeathYear] = useState('');
  const [editDeathMonth, setEditDeathMonth] = useState('');
  const [editDeathDay, setEditDeathDay] = useState('');
  const [editBirthCalendarType, setEditBirthCalendarType] = useState<CalendarType>('solar');
  const [editDeathCalendarType, setEditDeathCalendarType] = useState<CalendarType>('solar');

  const [showCrop, setShowCrop] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [avatarFileUrl, setAvatarFileUrl] = useState<string | null>(null);
  const [avatarFileBlob, setAvatarFileBlob] = useState<Blob | null>(null);
  const avatarUrl = useAvatarUrl(person?.id);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  if (!person) {
    return null;
  }

  const startEdit = () => {
    setEditName(person.name);
    setEditBirthYear(person.birthYear?.toString() ?? '');
    const bdParts = (person.birthDate ?? '').split('/');
    setEditBirthMonth(bdParts[0] ?? '');
    setEditBirthDay(bdParts[1] ?? '');
    setEditGender(person.gender);
    setEditTitle(person.title ?? '');
    setEditBio(person.bio ?? '');
    setEditDeathYear(person.deathYear ?? '');
    const ddParts = (person.deathDate ?? '').split('/');
    setEditDeathMonth(ddParts[0] ?? '');
    setEditDeathDay(ddParts[1] ?? '');
    setEditBirthCalendarType(person.birthCalendarType ?? 'solar');
    setEditDeathCalendarType(person.deathCalendarType ?? 'solar');
    setEditing(true);
  };

  const saveEdit = () => {
    const birthDate = (editBirthMonth.trim() || editBirthDay.trim())
      ? `${editBirthMonth.trim()}/${editBirthDay.trim()}`
      : undefined;
    const deathDate = (editDeathMonth.trim() || editDeathDay.trim())
      ? `${editDeathMonth.trim()}/${editDeathDay.trim()}`
      : undefined;
    updatePerson(person.id, {
      name: editName.trim() || person.name,
      birthYear: editBirthYear ? parseInt(editBirthYear, 10) : undefined,
      birthDate,
      deathYear: editDeathYear.trim() || undefined,
      deathDate,
      birthCalendarType: editBirthCalendarType,
      deathCalendarType: editDeathCalendarType,
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

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarFileUrl(url);
    setAvatarFileBlob(file);
    setShowCrop(true);
    if (avatarFileRef.current) avatarFileRef.current.value = '';
  };

  const closeCrop = () => {
    setShowCrop(false);
    if (avatarFileUrl) URL.revokeObjectURL(avatarFileUrl);
    setAvatarFileUrl(null);
    setAvatarFileBlob(null);
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
              <div className="form-group-header">
                <label>{t('birthYear')}</label>
                <div className="calendar-toggle">
                  <button
                    type="button"
                    className={editBirthCalendarType === 'solar' ? 'active' : ''}
                    onClick={() => setEditBirthCalendarType('solar')}
                  >
                    {t('solar')}
                  </button>
                  <button
                    type="button"
                    className={editBirthCalendarType === 'lunar' ? 'active' : ''}
                    onClick={() => setEditBirthCalendarType('lunar')}
                  >
                    {t('lunar')}
                  </button>
                </div>
              </div>
              <div className="field-row">
                <input
                  type="number"
                  value={editBirthYear}
                  onChange={(e) => setEditBirthYear(e.target.value)}
                  placeholder={t('birthYearPlaceholder')}
                />
                <input
                  type="text"
                  value={editBirthMonth}
                  onChange={(e) => setEditBirthMonth(e.target.value)}
                  placeholder={t('monthPlaceholder')}
                />
                <input
                  type="text"
                  value={editBirthDay}
                  onChange={(e) => setEditBirthDay(e.target.value)}
                  placeholder={t('dayPlaceholder')}
                />
              </div>
            </div>
            <div className="form-group">
              <div className="form-group-header">
                <label>{t('deathYear')}</label>
                <div className="calendar-toggle">
                  <button
                    type="button"
                    className={editDeathCalendarType === 'solar' ? 'active' : ''}
                    onClick={() => setEditDeathCalendarType('solar')}
                  >
                    {t('solar')}
                  </button>
                  <button
                    type="button"
                    className={editDeathCalendarType === 'lunar' ? 'active' : ''}
                    onClick={() => setEditDeathCalendarType('lunar')}
                  >
                    {t('lunar')}
                  </button>
                </div>
              </div>
              <div className="field-row">
                <input
                  type="text"
                  value={editDeathYear}
                  onChange={(e) => setEditDeathYear(e.target.value)}
                  placeholder={t('deathYearPlaceholder')}
                />
                <input
                  type="text"
                  value={editDeathMonth}
                  onChange={(e) => setEditDeathMonth(e.target.value)}
                  placeholder={t('monthPlaceholder')}
                />
                <input
                  type="text"
                  value={editDeathDay}
                  onChange={(e) => setEditDeathDay(e.target.value)}
                  placeholder={t('dayPlaceholder')}
                />
              </div>
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
            <div className="sidebar-avatar-section">
              <div
                className="sidebar-avatar"
                onClick={() => avatarFileRef.current?.click()}
                title={t('setAvatar')}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={person.name} />
                ) : (
                  <div className="sidebar-avatar-placeholder">
                    {person.name.charAt(0)}
                  </div>
                )}
              </div>
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarFile}
              />
            </div>
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
                  <span>
                    {person.birthYear}{person.birthDate ? ` (${person.birthDate})` : ''}
                    {person.birthCalendarType === 'lunar' ? ` ${t('lunar')}` : ''}
                  </span>
                </div>
              )}
              <div className="info-row">
                <span className="info-label">{t('generation')}</span>
                <span>{t('generationValue', { gen: person.generation })}</span>
              </div>
              {person.deathYear && (
                <div className="info-row">
                  <span className="info-label">{t('deathYear')}</span>
                  <span>
                    {person.deathYear}{person.deathDate ? ` (${person.deathDate})` : ''}
                    {person.deathCalendarType === 'lunar' ? ` ${t('lunar')}` : ''}
                  </span>
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
              <button className="btn-gallery" onClick={() => setShowGallery(true)}>{t('gallery')}</button>
              <button className="btn-edit" onClick={startEdit}>{t('edit')}</button>
              <button className="btn-delete" onClick={handleDelete}>{t('delete')}</button>
            </div>
            {showCrop && avatarFileUrl && avatarFileBlob && (
              <CropModal
                personId={person.id}
                sourceUrl={avatarFileUrl}
                sourceBlob={avatarFileBlob}
                onClose={closeCrop}
              />
            )}
            {showGallery && (
              <GalleryModal
                personId={person.id}
                onClose={() => setShowGallery(false)}
              />
            )}
          </>
        )}
      </div>
    </>
  );
};
