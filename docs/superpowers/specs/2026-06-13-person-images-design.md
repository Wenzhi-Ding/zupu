# Person Images: Avatar + Gallery

**Date:** 2026-06-13
**Status:** Approved (pending implementation)

## Overview

Add image support to persons in the family tree. Two distinct image concepts:

1. **Avatar** — A 1:1 cropped portrait shown on the SVG tree card and the sidebar. Users crop via a dedicated modal.
2. **Gallery** — Up to 9 images per person, uploaded without cropping, browsable in a separate gallery overlay with drag-to-reorder editing.

Images are stored as binary blobs in IndexedDB at runtime; only metadata (IDs) lives in localStorage. Export packages `data.json` + `images/` folder into a zip; import accepts both legacy `.json` and new `.zip`.

## Decisions

| Decision | Choice |
|----------|--------|
| Gallery location | Separate gallery modal (opened from Sidebar) |
| Avatar display | SVG tree card (small circle) + Sidebar (large circle) |
| Runtime storage | IndexedDB for blobs, localStorage for metadata |
| Avatar data model | Separate cropped blob (independent of source gallery image) |
| Upload compression | Compress only if >2MB (max dimension 1200px, JPEG quality 0.85) |
| Crop library | `react-easy-crop` |
| Zip library | `jszip` |

## Data Model

### Person type extension (`src/types/index.ts`)

```ts
export interface Person {
  // ...existing fields...
  avatarImageId?: string;      // ID of cropped 1:1 avatar blob in IndexedDB
  galleryImageIds?: string[];  // Ordered list of gallery image IDs (max 9)
}
```

### Image metadata type

```ts
export interface ImageMeta {
  id: string;          // uuid, matches filename in images/ folder
  personId: string;
  format: string;      // 'jpeg' | 'png' | 'webp'
  kind: 'avatar' | 'gallery';
}
```

### Export data extension

```ts
export interface ExportData extends LocalData {
  images?: Record<string, ImageMeta>;  // imageId -> metadata
}
```

## Storage Architecture

### localStorage

Unchanged structure. Person objects now carry `avatarImageId` / `galleryImageIds` string fields (tiny overhead). All binary blobs live exclusively in IndexedDB.

### IndexedDB (`src/store/imageDb.ts` — new file)

- **DB name:** `zupu-images`, version 1
- **Object store:** `images`, keyPath: `id`
- **Stored value:** `{ id, personId, blob, format, kind, createdAt }`
- **Indexes:** `by_personId` (for cleanup queries when deleting persons)

### Module API (`imageDb.ts`)

```ts
saveImage(meta: { id, personId, format, kind }, blob: Blob): Promise<void>
getImage(id: string): Promise<{ blob: Blob, format: string } | null>
deleteImage(id: string): Promise<void>
deleteImagesForPerson(personId: string): Promise<void>
getAllImagesForExport(): Promise<Array<{ id, personId, blob, format, kind }>>
bulkImportImages(entries: Array<{ id, personId, blob, format, kind }>): Promise<void>
clearAllImages(): Promise<void>
```

### Store integration

- `removePerson` and `removePersons` in `familyStore.ts` also call `deleteImagesForPerson(id)`.
- `updatePerson` action extended to accept `avatarImageId` and `galleryImageIds` patches.
- `validatePerson` in `localDb.ts` extended to validate the two new optional fields (string / string[]).

## UI Components

### 1. Avatar on tree card (`PersonCard.tsx` — modify)

- Add SVG `<clipPath>` + `<image>` clipped to a small circle (~22px diameter) at top-center of card.
- New hook `useAvatarUrl(personId)` reads `person.avatarImageId` from IndexedDB, returns object URL (revoked on unmount/person change).
- **Chinese card** (64x100): avatar circle at top center, name text shifts down ~8px to accommodate.
- **English card** (100x72): avatar circle at top-left corner (~18px), name layout unchanged.
- If no avatar set: card renders exactly as today (zero layout change).

### 2. Sidebar avatar + entry points (`Sidebar.tsx` — modify)

- Large circular avatar (72px) at top of sidebar, above the existing name `<h3>`.
- Two buttons below the avatar/info section: **"Set Avatar"** (opens CropModal) and **"Gallery"** (opens GalleryModal).
- Clicking the avatar also opens the GalleryModal.

### 3. Gallery modal (`GalleryModal.tsx` — new)

- Overlay dialog (~600x500px), follows the dialog-overlay pattern from `AddPersonDialog`.
- **View mode:** 3x3 grid of thumbnails (up to 9). Click any thumbnail to enter large image view with prev/next navigation. Each image has a "Set as Avatar" button.
- **Edit mode** (toggle button): drag-to-reorder thumbnails, delete button per image, upload button.
- Upload: `<input type="file" multiple accept="image/*">`. Each image compressed if >2MB (max dimension 1200px, JPEG quality 0.85). Added to `galleryImageIds` array.
- Max 9 images enforced. Upload button disabled when 9 images reached.
- Reordering updates `person.galleryImageIds` via `updatePerson`.

### 4. Crop modal (`CropModal.tsx` — new)

- Uses `react-easy-crop` with `aspect={1}`.
- **Source:** either a newly selected file (via file picker) or an existing gallery image blob (passed in).
- **Controls:** zoom slider + drag-to-pan (react-easy-crop handles touch gestures natively).
- **On confirm:** canvas renders the cropped region to a 256x256 JPEG blob. Calls `saveImage()` to write to IndexedDB with `kind: 'avatar'`. Updates `person.avatarImageId` via `updatePerson`.
- **On cancel:** no changes.

### 5. Image hooks (`src/hooks/useImageUrl.ts` — new)

```ts
useImageUrl(imageId: string | undefined): string | null
// Loads blob from IndexedDB, returns object URL.
// Revokes previous URL on imageId change or unmount.
// Returns null while loading or if imageId is undefined.

useAvatarUrl(personId: string): string | null
// Wrapper: reads person.avatarImageId from store, delegates to useImageUrl.
```

## Export/Import

### Export (always zip)

**Zip structure:**
```
族谱数据.zip
+-- data.json          # LocalData + images metadata
+-- images/
    +-- <person_id>/
        +-- <image_id>.jpeg
        +-- <image_id>.png
```

**Export flow** (`useDataIO.ts` — modify):
1. Build `data` object as today, plus `images` map (imageId -> ImageMeta) from IndexedDB.
2. Create JSZip instance. Add `data.json` string.
3. For each image in IndexedDB: `zip.file(\`images/${personId}/${id}.${format}\`, blob)`.
4. Generate blob via `zip.generateAsync({ type: 'blob' })`. Trigger download as `族谱数据.zip`.

### Import (backward compatible)

**File input** `accept` changes from `.json` to `.json,.zip`.

**Import flow:**
1. Detect by file extension: `.json` -> old path; `.zip` -> new path.
2. **Old `.json`:** existing `importData()` parses LocalData. Person objects may carry `avatarImageId` / `galleryImageIds` referencing images that no longer exist. Hooks return `null` gracefully (no avatar shown, no crash). Clear IndexedDB `images` store to remove orphaned blobs from previous data.
3. **New `.zip`:** `JSZip.loadAsync(file)` -> extract `data.json` -> `importData()` parse -> extract each `images/**/*` file as blob -> `bulkImportImages()` writes blobs + metadata to IndexedDB keyed by imageId.

**Edge cases:**
- Zip with no `images/` folder (data.json only): treated like old format (no images loaded).
- Person references an image ID missing from the zip: hook returns null, no error.
- Import always clears the IndexedDB images store before writing (full data overwrite semantics, consistent with existing import behavior).

## New Dependencies

| Package | Type | Purpose | Approx size |
|---------|------|---------|-------------|
| `react-easy-crop` | dependencies | 1:1 avatar crop UI with pan/zoom | ~30KB |
| `jszip` | dependencies | Zip packaging for export/import | ~100KB |
| `fake-indexeddb` | devDependencies | In-memory IndexedDB mock for unit tests | ~50KB |

## File Changes Summary

### New files
- `src/store/imageDb.ts` — IndexedDB image blob storage layer
- `src/hooks/useImageUrl.ts` — React hooks for loading image URLs from IndexedDB
- `src/components/GalleryModal.tsx` + `.css` — Gallery overlay (view + edit)
- `src/components/CropModal.tsx` + `.css` — Avatar crop modal

### Modified files
- `src/types/index.ts` — add `avatarImageId`, `galleryImageIds` to Person; add `ImageMeta`
- `src/store/localDb.ts` — validate new Person fields; add `images` to ExportData
- `src/store/familyStore.ts` — cleanup images on person delete; extend `updatePerson`
- `src/store/useDataIO.ts` — zip export, dual-format import
- `src/components/PersonCard.tsx` — render avatar circle via SVG clipPath
- `src/components/Sidebar.tsx` — avatar display, gallery/crop entry buttons
- `src/components/DataManager.tsx` — update file input accept to `.json,.zip`
- `src/i18n/` — new translation keys for image-related UI

## Testing Plan

| Module | Test type | Coverage |
|--------|-----------|----------|
| `imageDb.ts` | Unit (mock IndexedDB via fake-indexeddb) | save/get/delete/bulkImport/clearAll |
| `localDb.ts` | Unit (extend existing) | validate new Person fields, images map round-trip |
| `useImageUrl` hook | Integration (render hook) | loads URL, revokes on cleanup, null for missing |
| Image compression util | Unit | compress if >2MB, skip if small, preserve aspect ratio |
| Export zip | Unit (mock JSZip) | correct file paths, data.json includes images map |
| Import | Unit | .json backward compat, .zip with images, .zip without images |
| PersonCard avatar | Component test | renders avatar circle when present, absent when no avatar |
| GalleryModal | Component test | view/edit toggle, upload, reorder, delete, max 9 |
| CropModal | Component test | crop produces blob, cancel does nothing |

### Coverage targets
New code should meet existing thresholds (lines 50%, functions 50%, branches 35%, statements 45%). `imageDb.ts` and compression util are pure logic — aim higher (>80% lines).
