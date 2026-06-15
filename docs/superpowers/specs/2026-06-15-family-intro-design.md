# Family Introduction (家族介绍) — Design Spec

## Summary

Allow users to attach a plain-text "family introduction" to any person card. Cards with an intro display a filled orange badge in the bottom-left corner; clicking it opens a centered modal to read or edit. To create a new intro, the "+" button's AddPersonDialog gains a "增加家族介绍" button below the 6 relation types — clicking it opens the modal directly in edit mode. The feature is independent from the existing per-person "bio" field — it describes the family/clan, not the individual.

## User-Decided Design Choices

| Decision | Choice |
|----------|--------|
| Relationship to bio | Independent concept (family-level, not person-level) |
| Who can have an intro | Any person; one intro per person max |
| Content format | Plain text (consistent with bio) |
| Badge position | Bottom-left corner of card (only visible when intro exists) |
| Expand interaction | Centered modal dialog |
| Creation entry point | "增加家族介绍" button in AddPersonDialog (+ button menu) |
| Editing entry point | Inside the modal (read mode → edit toggle, or direct edit mode from AddPersonDialog) |
| TreeManager changes | None |

## Data Model

### Person type (`src/types/index.ts`)

Add an optional `familyIntro` field:

```ts
export interface Person {
  // ... existing fields ...
  familyIntro?: string;
}
```

This follows the same pattern as `bio`, `title`, and other optional text fields.

### Why a field on Person (not a separate collection)

- One intro per person max — no need for a separate entity.
- Automatically persisted via existing `saveLocalData` / `loadLocalData`.
- Automatically included in import/export (it's part of the Person object).
- `updatePerson` already handles partial patches; just extend the allowed keys.

## Component Changes

### 1. New: `FamilyIntroModal.tsx` (+ CSS)

A centered modal with two modes. The initial mode is determined by how the modal was opened (see Store section).

**Read mode:**
- Title: `t('familyIntroTitle')` ("家族介绍")
- Shows the person's name as context
- Displays `person.familyIntro` as preformatted text (preserves line breaks)
- Buttons: "编辑" (edit) and "关闭" (close)

**Edit mode:**
- Same title
- `<textarea>` bound to local state, initialized from `person.familyIntro ?? ''`
- Placeholder: `t('familyIntroPlaceholder')` ("描述这个家族的起源、迁徙、历史等...")
- Buttons: "保存" (save) and "取消" (cancel)
- Save: calls `updatePerson(personId, { familyIntro: text.trim() || undefined })`, then closes the modal
- Cancel: discards changes and closes the modal

**Structure:** Same overlay/backdrop pattern as `GalleryModal.tsx` and `CropModal.tsx`.

### 2. Modified: `PersonCard.tsx`

Add a badge in the bottom-left corner of the SVG card:

- **Position:** `cx={10}, cy={CARD_HEIGHT - 10}` (i.e., 10px from left, 10px from bottom)
- **Style:** Filled orange circle (radius 8, `#f0a020`), white border, "族" (zh) / "F" (en) in white text
- **Visibility:** Only rendered when `person.familyIntro` is truthy AND not in `relationMode`, `selectMode`, or `moveTargetMode`
- **Click handler:** `e.stopPropagation()` + calls a new prop `onShowFamilyIntro(person.id)`
- Does NOT trigger `selectPerson` — only opens the modal in read mode

### 3. Modified: `AddPersonDialog.tsx`

Add a "增加家族介绍" button below the 6 relation-type buttons:

- Positioned after the `.relation-buttons` grid, separated by a small visual divider
- Styled distinctly from relation buttons (e.g., full-width, different color) to signal it's a different action
- On click: calls `onClose()` to close the dialog, then opens the FamilyIntroModal in edit mode via `setFamilyIntroPersonId(targetPersonId, true)`

### 4. Modified: `FamilyTree.tsx`

- Reads `familyIntroPersonId` from the store
- Renders `<FamilyIntroModal>` when `familyIntroPersonId` is set
- Passes `onShowFamilyIntro` callback to `PersonCard`, which calls `setFamilyIntroPersonId(personId)` (defaults to read mode)

## Store Changes (`src/store/familyStore.ts`)

### New state

```ts
familyIntroPersonId: string | null;
familyIntroEditMode: boolean;  // initial mode when modal opens
```

### New action

```ts
setFamilyIntroPersonId: (id: string | null, editMode?: boolean) => void;
```

- `editMode` defaults to `false` (read mode). 
- Called from PersonCard badge: `setFamilyIntroPersonId(id)` → read mode.
- Called from AddPersonDialog: `setFamilyIntroPersonId(id, true)` → edit mode.

This action does NOT call `persistState` — it's transient UI state (like `showTreeManager`), not persisted data.

### Modified action

`updatePerson` patch type: add `'familyIntro'` to the `Pick<Person, ...>` union.

### `reset()` and `loadSampleData()`

Set `familyIntroPersonId: null` and `familyIntroEditMode: false`.

## Persistence Layer (`src/store/localDb.ts`)

### `validatePerson`

Add validation for `familyIntro`:
- If present, must be a string
- Include in the returned Person object

### `importData` / `exportData`

No changes needed — `familyIntro` is part of the Person object, automatically serialized/deserialized.

## i18n (`src/i18n/zh.ts` + `en.ts`)

New keys:

| Key | zh | en |
|-----|----|----|
| `familyIntroTitle` | 家族介绍 | Family Introduction |
| `familyIntroBadge` | 族 | F |
| `addFamilyIntro` | 增加家族介绍 | Add Family Intro |
| `editFamilyIntro` | 编辑 | Edit |
| `familyIntroPlaceholder` | 描述这个家族的起源、迁徙、历史等... | Describe this family's origin, migration, history... |

## CSS (`FamilyIntroModal.css`)

Follow existing modal patterns (GalleryModal.css, CropModal.css):
- Fixed overlay with semi-transparent backdrop
- Centered modal panel
- Close button in header
- Content area with padding
- Action buttons at bottom

## Testing

### Unit tests

- **`localDb.test.ts`**: validate that `familyIntro` is accepted as a string and rejected for non-string types during import.
- **`familyStore.test.ts`**: verify `updatePerson` with `{ familyIntro: 'text' }` persists correctly; verify `setFamilyIntroPersonId` sets/clears state.

### Manual testing

- Open "+" dialog → click "增加家族介绍" → modal opens in edit mode
- Type text and save → badge (orange "族") appears on card
- Click badge → modal opens in read mode showing the intro
- Click "编辑" in modal → edit the text → save → content updates
- Delete all text and save → badge disappears (familyIntro becomes undefined)
- Open "+" dialog for a person with existing intro → click "增加家族介绍" → modal opens in edit mode with existing text
- Import/export round-trip preserves familyIntro
- Badge not shown in relation mode, select mode, or move target mode

## Out of Scope

- TreeManager integration (user explicitly declined)
- Sidebar editing (user chose modal-only editing)
- Rich text / Markdown formatting (user chose plain text)
- Multiple intros per person (user chose one max)
- Searching/filtering by family intro content
