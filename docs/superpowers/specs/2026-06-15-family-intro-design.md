# Family Introduction (家族介绍) — Design Spec

## Summary

Allow users to attach a plain-text "family introduction" to any person card. Every card displays a badge in the bottom-left corner — filled orange when an intro exists, dimmed outline when none exists yet. Clicking the badge opens a centered modal to read or edit the intro. The feature is independent from the existing per-person "bio" field — it describes the family/clan, not the individual.

## User-Decided Design Choices

| Decision | Choice |
|----------|--------|
| Relationship to bio | Independent concept (family-level, not person-level) |
| Who can have an intro | Any person; one intro per person max |
| Content format | Plain text (consistent with bio) |
| Badge position | Bottom-left corner of card (always visible; dimmed when no intro) |
| Expand interaction | Centered modal dialog |
| Editing entry point | Inside the modal only (read mode + edit mode toggle) |
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

A centered modal with two modes:

**Read mode (default):**
- Title: `t('familyIntroTitle')` ("家族介绍")
- Shows the person's name as context
- Displays `person.familyIntro` as preformatted text (preserves line breaks)
- Buttons: "编辑" (edit) and "关闭" (close)
- If `familyIntro` is empty/undefined: show empty-state prompt and default to edit mode so the user can immediately create one

**Edit mode:**
- Same title
- `<textarea>` bound to local state, initialized from `person.familyIntro ?? ''`
- Placeholder: `t('familyIntroPlaceholder')` ("描述这个家族的起源、迁徙、历史等...")
- Buttons: "保存" (save) and "取消" (cancel)
- Save: calls `updatePerson(personId, { familyIntro: text.trim() || undefined })`, returns to read mode (or closes if text is empty and was previously empty)
- Cancel: discards changes, returns to read mode

**Structure:** Same overlay/backdrop pattern as `GalleryModal.tsx` and `CropModal.tsx`.

### 2. Modified: `PersonCard.tsx`

Add a badge in the bottom-left corner of the SVG card:

- **Position:** `cx={10}, cy={CARD_HEIGHT - 10}` (i.e., 10px from left, 10px from bottom)
- **Style:** Two visual states:
  - **Has intro:** Filled orange circle (`#f0a020`), white border, "族" (zh) / "F" (en) in white text
  - **No intro yet:** Outline-only dimmed circle (border `#ccc`, transparent fill), "族" (zh) / "F" (en) in gray text
- **Visibility:** Always rendered on every card (regardless of intro existence), EXCEPT when in `relationMode`, `selectMode`, or `moveTargetMode`
- **Click handler:** `e.stopPropagation()` + calls a new prop `onShowFamilyIntro(person.id)`
- Does NOT trigger `selectPerson` — only opens the modal
- **Rationale:** The badge must be visible even when no intro exists, otherwise users have no way to create the first intro. The dimmed outline style distinguishes "has intro" from "no intro" without adding a separate entry point.

### 3. Modified: `FamilyTree.tsx`

- Reads `familyIntroPersonId` from the store
- Renders `<FamilyIntroModal>` when `familyIntroPersonId` is set
- Passes `onShowFamilyIntro` callback to `PersonCard`, which calls `setFamilyIntroPersonId(personId)`

## Store Changes (`src/store/familyStore.ts`)

### New state

```ts
familyIntroPersonId: string | null;
```

### New action

```ts
setFamilyIntroPersonId: (id: string | null) => void;
```

This action does NOT call `persistState` — it's transient UI state (like `showTreeManager`), not persisted data.

### Modified action

`updatePerson` patch type: add `'familyIntro'` to the `Pick<Person, ...>` union.

### `reset()` and `loadSampleData()`

Set `familyIntroPersonId: null`.

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
| `editFamilyIntro` | 编辑 | Edit |
| `familyIntroPlaceholder` | 描述这个家族的起源、迁徙、历史等... | Describe this family's origin, migration, history... |
| `familyIntroEmpty` | 暂无家族介绍，点击编辑添加 | No family intro yet. Click edit to add one. |

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

- Add family intro to a person via modal → badge changes from dimmed to filled orange
- Click badge (with intro) → modal opens in read mode
- Click badge (without intro) → modal opens directly in edit mode
- Edit and save → content updates, badge persists
- Delete all text and save → badge reverts to dimmed outline style (familyIntro becomes undefined)
- Import/export round-trip preserves familyIntro
- Badge always shown except in relation mode, select mode, or move target mode

## Out of Scope

- TreeManager integration (user explicitly declined)
- Sidebar editing (user chose modal-only editing)
- Rich text / Markdown formatting (user chose plain text)
- Multiple intros per person (user chose one max)
- Searching/filtering by family intro content
