import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
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
  };

  const handleSetAsAvatar = async (imageId: string) => {
    const result = await getImage(imageId);
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    setViewerIdx(null);
    setCropSource({ url, blob: result.blob });
  };

  const handleReorder = (fromIdx: number, toIdx: number) => {
    const next = [...galleryIds];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    updatePerson(personId, { galleryImageIds: next });
  };

  const viewerId = viewerIdx !== null ? galleryIds[viewerIdx] : null;

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
              <button className="close-btn" onClick={onClose}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div className="gallery-grid">
            {galleryIds.length === 0 && (
              <div
                className="gallery-upload-tile gallery-upload-tile--empty"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>{t('noGalleryImages')}</span>
              </div>
            )}
            {galleryIds.map((imageId, idx) => (
              <GalleryThumb
                key={imageId}
                imageId={imageId}
                editMode={editMode}
                onClick={() => !editMode && setViewerIdx(idx)}
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
            {!editMode && galleryIds.length > 0 && galleryIds.length < MAX_IMAGES && (
              <button
                className="gallery-upload-tile"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
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

      {viewerId && viewerIdx !== null && (
        <GalleryViewer
          imageId={viewerId}
          onPrev={() => setViewerIdx((viewerIdx - 1 + galleryIds.length) % galleryIds.length)}
          onNext={() => setViewerIdx((viewerIdx + 1) % galleryIds.length)}
          onSetAvatar={() => handleSetAsAvatar(viewerId)}
          onClose={() => setViewerIdx(null)}
        />
      )}

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
      <div className="gallery-thumb-image">
        {url && <img src={url} alt="" loading="lazy" />}
      </div>
      {editMode && (
        <button
          className="thumb-delete"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="Delete"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
};

interface ViewerProps {
  imageId: string;
  onPrev: () => void;
  onNext: () => void;
  onSetAvatar: () => void;
  onClose: () => void;
}

const GalleryViewer: React.FC<ViewerProps> = ({
  imageId,
  onPrev,
  onNext,
  onSetAvatar,
  onClose,
}) => {
  const url = useImageUrl(imageId);
  const t = useT();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => setVisible(true));
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleClose, onPrev, onNext]);

  return (
    <div
      className={`gallery-overlay ${visible ? 'visible' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      ref={overlayRef}
    >
      <button className="gallery-viewer-close" onClick={handleClose} aria-label="Close">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <button className="gallery-viewer-nav prev" onClick={onPrev} aria-label="Previous">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button className="gallery-viewer-nav next" onClick={onNext} aria-label="Next">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 6 15 12 9 18" />
        </svg>
      </button>

      <div className="gallery-viewer-content">
        {url && <img src={url} alt="" className="gallery-viewer-img" />}
        <button className="gallery-viewer-avatar-btn" onClick={onSetAvatar}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {t('setAsAvatar')}
        </button>
      </div>
    </div>
  );
};
