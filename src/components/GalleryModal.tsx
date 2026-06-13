import React, { useState, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { useFamilyStore } from '../store/familyStore';
import { saveImage, getImage, deleteImage } from '../store/imageDb';
import { compressImage, getImageFormat } from '../utils/imageCompression';
import { useImageUrl } from '../hooks/useImageUrl';
import { CropModal } from './CropModal';
import { useT } from '../i18n';
import './GalleryModal.css';

const MAX_IMAGES = 9;

interface Props {
  personId: string;
  onClose: () => void;
}

export const GalleryModal: React.FC<Props> = ({ personId, onClose }) => {
  const person = useFamilyStore((s) => s.persons[personId]);
  const updatePerson = useFamilyStore((s) => s.updatePerson);
  const t = useT();

  const [editMode, setEditMode] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [cropSource, setCropSource] = useState<{ url: string; blob: Blob } | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!person) return null;

  const galleryIds = person.galleryImageIds ?? [];

  const handleUpload = async (files: FileList) => {
    const remaining = MAX_IMAGES - galleryIds.length;
    const toAdd = Array.from(files).slice(0, remaining);

    const newIds: string[] = [];
    for (const file of toAdd) {
      const compressed = await compressImage(file);
      const format = getImageFormat(compressed);
      const imageId = uuid();
      await saveImage({ id: imageId, personId, format, kind: 'gallery' }, compressed);
      newIds.push(imageId);
    }

    updatePerson(personId, { galleryImageIds: [...galleryIds, ...newIds] });
  };

  const handleDelete = async (imageId: string) => {
    await deleteImage(imageId);
    const next = galleryIds.filter((id) => id !== imageId);
    updatePerson(personId, { galleryImageIds: next });
    if (person.avatarImageId === imageId) {
      updatePerson(personId, { avatarImageId: undefined });
    }
    setSelectedIdx(null);
  };

  const handleSetAsAvatar = async (imageId: string) => {
    const result = await getImage(imageId);
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    setCropSource({ url, blob: result.blob });
  };

  const handleReorder = (fromIdx: number, toIdx: number) => {
    const next = [...galleryIds];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    updatePerson(personId, { galleryImageIds: next });
  };

  const selectedId = selectedIdx !== null ? galleryIds[selectedIdx] : null;

  return (
    <>
      <div className="dialog-overlay" onClick={onClose}>
        <div className="gallery-modal" onClick={(e) => e.stopPropagation()}>
          <div className="gallery-header">
            <h3>{t('gallery')}</h3>
            <div className="gallery-header-actions">
              {galleryIds.length > 0 && (
                <button
                  className="gallery-edit-btn"
                  onClick={() => setEditMode(!editMode)}
                >
                  {editMode ? t('doneEditing') : t('editGallery')}
                </button>
              )}
              <button className="close-btn" onClick={onClose}>✕</button>
            </div>
          </div>

          {selectedId && !editMode && (
            <LargeImageView
              imageId={selectedId}
              onPrev={() => setSelectedIdx(Math.max(0, (selectedIdx ?? 0) - 1))}
              onNext={() => setSelectedIdx(Math.min(galleryIds.length - 1, (selectedIdx ?? 0) + 1))}
              onSetAvatar={() => handleSetAsAvatar(selectedId)}
              canPrev={(selectedIdx ?? 0) > 0}
              canNext={(selectedIdx ?? 0) < galleryIds.length - 1}
            />
          )}

          <div className="gallery-grid">
            {galleryIds.length === 0 && (
              <div className="gallery-empty">{t('noGalleryImages')}</div>
            )}
            {galleryIds.map((imageId, idx) => (
              <GalleryThumb
                key={imageId}
                imageId={imageId}
                editMode={editMode}
                onClick={() => !editMode && setSelectedIdx(idx)}
                onDelete={() => handleDelete(imageId)}
                draggable={editMode}
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx !== null && dragIdx !== idx) {
                    handleReorder(dragIdx, idx);
                  }
                  setDragIdx(null);
                }}
              />
            ))}
            {!editMode && galleryIds.length < MAX_IMAGES && (
              <button
                className="gallery-upload-tile"
                onClick={() => fileInputRef.current?.click()}
              >
                <span>+</span>
              </button>
            )}
          </div>

          {editMode && (
            <div className="gallery-edit-bar">
              <span className="gallery-count">{galleryIds.length}/{MAX_IMAGES}</span>
              <button
                className="gallery-upload-btn"
                disabled={galleryIds.length >= MAX_IMAGES}
                onClick={() => fileInputRef.current?.click()}
              >
                {galleryIds.length >= MAX_IMAGES ? t('galleryFull') : t('uploadImage')}
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files) handleUpload(e.target.files);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
        </div>
      </div>

      {cropSource && (
        <CropModal
          personId={personId}
          sourceUrl={cropSource.url}
          sourceBlob={cropSource.blob}
          onClose={() => {
            URL.revokeObjectURL(cropSource.url);
            setCropSource(null);
          }}
        />
      )}
    </>
  );
};

interface ThumbProps {
  imageId: string;
  editMode: boolean;
  onClick: () => void;
  onDelete: () => void;
  draggable: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}

const GalleryThumb: React.FC<ThumbProps> = ({
  imageId,
  editMode,
  onClick,
  onDelete,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const url = useImageUrl(imageId);
  return (
    <div
      className={`gallery-thumb ${editMode ? 'editable' : ''}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {url && <img src={url} alt="" />}
      {editMode && (
        <button className="thumb-delete" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          ✕
        </button>
      )}
    </div>
  );
};

interface LargeViewProps {
  imageId: string;
  onPrev: () => void;
  onNext: () => void;
  onSetAvatar: () => void;
  canPrev: boolean;
  canNext: boolean;
}

const LargeImageView: React.FC<LargeViewProps> = ({
  imageId,
  onPrev,
  onNext,
  onSetAvatar,
  canPrev,
  canNext,
}) => {
  const url = useImageUrl(imageId);
  const t = useT();
  return (
    <div className="gallery-large">
      {canPrev && <button className="gallery-nav prev" onClick={onPrev}>‹</button>}
      {url && <img src={url} alt="" className="gallery-large-img" />}
      {canNext && <button className="gallery-nav next" onClick={onNext}>›</button>}
      <button className="gallery-set-avatar" onClick={onSetAvatar}>
        {t('setAsAvatar')}
      </button>
    </div>
  );
};
