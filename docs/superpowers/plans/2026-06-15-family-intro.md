# Family Introduction (家族介绍) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "family introduction" text field to any person, displayed via a badge on the card and a centered modal for reading/editing.

**Architecture:** New optional `familyIntro` field on `Person`. New `FamilyIntroModal` component for read/edit. Badge on `PersonCard` (bottom-left). Creation entry point via "增加家族介绍" button in `AddPersonDialog`.

**Tech Stack:** React 19, TypeScript 5.9, Zustand 5, Vite 7

**Spec:** `docs/superpowers/specs/2026-06-15-family-intro-design.md`

---

### Task 1: Add `familyIntro` field to Person type and validation

**Files:**
- Modify: `src/types/index.ts:4-24`
- Modify: `src/store/localDb.ts:13-109`

- [ ] **Step 1: Add `familyIntro` to Person interface**

In `src/types/index.ts`, add `familyIntro?: string;` after the `galleryImageIds` field (line 23):

```ts
export interface Person {
  id: string;
  name: string;
  gender: Gender;
  birthYear?: number;
  birthDate?: string;
  deathYear?: string;
  deathDate?: string;
  birthCalendarType?: CalendarType;
  deathCalendarType?: CalendarType;
  title?: string;
  generation: number;
  spouseIds: string[];
  childrenIds: string[];
  parentIds: string[];
  collapsed: boolean;
  parentCollapsed?: boolean;
  bio?: string;
  avatarImageId?: string;
  galleryImageIds?: string[];
  familyIntro?: string;
}
```

- [ ] **Step 2: Add `familyIntro` validation to `validatePerson`**

In `src/store/localDb.ts`, add destructuring and validation for `familyIntro`.

In the destructuring line (line 18-19), add `familyIntro` to the list:

```ts
  const { id, name, gender, birthYear, birthDate, deathYear, deathDate, birthCalendarType, deathCalendarType, title, generation,
          spouseIds, childrenIds, parentIds, collapsed, parentCollapsed, bio,
          avatarImageId, galleryImageIds, familyIntro } = raw;
```

Add validation after the `galleryImageIds` validation block (after line 66):

```ts
  if (familyIntro !== undefined && typeof familyIntro !== 'string') {
    throw new Error(`Invalid person "${key}": familyIntro must be a string if provided`);
  }
```

Add `familyIntro` to the returned object (after line 107, before the closing `};`):

```ts
    ...(familyIntro !== undefined ? { familyIntro } : {}),
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/store/localDb.ts
git commit -m "Add familyIntro field to Person type and validation"
```

---

### Task 2: Add store state and actions for the modal

**Files:**
- Modify: `src/store/familyStore.ts:15-70` (interface), `src/store/familyStore.ts:220-242` (initial state), `src/store/familyStore.ts:41` (updatePerson), `src/store/familyStore.ts:582-585` (reset), `src/store/familyStore.ts:781-806` (loadSampleData)

- [ ] **Step 1: Add `familyIntro` to `updatePerson` patch type**

In `src/store/familyStore.ts` line 41, add `'familyIntro'` to the Pick union:

```ts
  updatePerson: (id: string, patch: Partial<Pick<Person, 'name' | 'gender' | 'birthYear' | 'birthDate' | 'deathYear' | 'deathDate' | 'birthCalendarType' | 'deathCalendarType' | 'bio' | 'title' | 'avatarImageId' | 'galleryImageIds' | 'familyIntro'>>) => void;
```

- [ ] **Step 2: Add new state fields to `FamilyState` interface**

Add after `moveTargetMode: boolean;` (line 34):

```ts
  familyIntroPersonId: string | null;
  familyIntroEditMode: boolean;
```

- [ ] **Step 3: Add new action to `FamilyState` interface**

Add after `setMoveTargetMode` (line 63):

```ts
  setFamilyIntroPersonId: (id: string | null, editMode?: boolean) => void;
```

- [ ] **Step 4: Add initial state values**

Add after `moveTargetMode: false,` (around line 239):

```ts
      familyIntroPersonId: null,
      familyIntroEditMode: false,
```

- [ ] **Step 5: Implement `setFamilyIntroPersonId` action**

Add after the `setMoveTargetMode` action (around line 763):

```ts
      setFamilyIntroPersonId: (id, editMode) => {
        set({ familyIntroPersonId: id, familyIntroEditMode: editMode ?? false });
      },
```

- [ ] **Step 6: Update `reset()` to clear modal state**

In the `reset` action (line 584), add `familyIntroPersonId: null, familyIntroEditMode: false,` to the `set()` call:

```ts
      reset: () => {
        clearLocalData();
        set({ persons: {}, selectedPersonId: null, siblingOrder: {}, spouseOrder: {}, relationMode: false, relationPickedIds: [], relationPath: null, currentTree: null, availableTrees: [], treeNames: {}, showTreeManager: false, _dirtyAfterExport: false, selectMode: false, selectedIds: [], moveTargetMode: false, familyIntroPersonId: null, familyIntroEditMode: false });
      },
```

- [ ] **Step 7: Update `loadSampleData` to clear modal state**

In the `loadSampleData` action (line 782-796), add `familyIntroPersonId: null, familyIntroEditMode: false,` to the `update` object:

```ts
      loadSampleData: (data, treeNameMap) => {
        const update = {
          persons: data.persons,
          siblingOrder: data.siblingOrder,
          spouseOrder: data.spouseOrder,
          treeNames: treeNameMap,
          selectedPersonId: data.selectedPersonId,
          currentTree: null as string | null,
          availableTrees: deriveTreeList(data.persons, treeNameMap),
          showTreeManager: false,
          anchorPersonId: null as string | null,
          relationMode: false,
          relationPickedIds: [] as FamilyState['relationPickedIds'],
          relationPath: null as string[] | null,
          _dirtyAfterExport: false,
          familyIntroPersonId: null as string | null,
          familyIntroEditMode: false,
        };
```

- [ ] **Step 8: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add src/store/familyStore.ts
git commit -m "Add familyIntro modal state and actions to store"
```

---

### Task 3: Add i18n keys

**Files:**
- Modify: `src/i18n/zh.ts:276` (add before closing `};`)
- Modify: `src/i18n/en.ts:277` (add before closing `};`)

- [ ] **Step 1: Add keys to `zh.ts`**

Add after `dragToReorder: '拖动排序',` (line 276):

```ts
  dragToReorder: '拖动排序',

  // Family intro
  familyIntroTitle: '家族介绍',
  familyIntroBadge: '族',
  addFamilyIntro: '增加家族介绍',
  editFamilyIntro: '编辑',
  familyIntroPlaceholder: '描述这个家族的起源、迁徙、历史等...',
```

- [ ] **Step 2: Add keys to `en.ts`**

Add after `dragToReorder: 'Drag to reorder',` (line 277):

```ts
  dragToReorder: 'Drag to reorder',

  // Family intro
  familyIntroTitle: 'Family Introduction',
  familyIntroBadge: 'F',
  addFamilyIntro: 'Add Family Intro',
  editFamilyIntro: 'Edit',
  familyIntroPlaceholder: 'Describe this family\'s origin, migration, history...',
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors (en.ts must have all keys from zh.ts)

- [ ] **Step 4: Commit**

```bash
git add src/i18n/zh.ts src/i18n/en.ts
git commit -m "Add i18n keys for family introduction feature"
```

---

### Task 4: Create `FamilyIntroModal` component

**Files:**
- Create: `src/components/FamilyIntroModal.tsx`
- Create: `src/components/FamilyIntroModal.css`

- [ ] **Step 1: Create `FamilyIntroModal.css`**

```css
.family-intro-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.family-intro-modal {
  background: #fff;
  border-radius: 12px;
  padding: 28px 32px;
  min-width: 380px;
  max-width: 560px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}

@media (max-width: 640px) {
  .family-intro-modal {
    min-width: auto;
    width: calc(100vw - 32px);
    max-width: 560px;
    padding: 20px;
  }
}

.family-intro-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.family-intro-header h3 {
  margin: 0;
  font-size: 18px;
  color: #1a1a2e;
}

.family-intro-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  padding: 4px 8px;
}

.family-intro-close:hover {
  color: #333;
}

.family-intro-person-name {
  font-size: 14px;
  color: #888;
  margin-bottom: 16px;
}

.family-intro-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.8;
  color: #333;
  overflow-y: auto;
  flex: 1;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}

.family-intro-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.8;
  font-family: inherit;
  resize: vertical;
  min-height: 200px;
  outline: none;
  transition: border-color 0.2s;
}

.family-intro-textarea:focus {
  border-color: #4a90d9;
  box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.1);
}

.family-intro-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: flex-end;
}

.family-intro-actions .btn-cancel {
  padding: 10px 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  color: #666;
}

.family-intro-actions .btn-cancel:hover {
  background: #f0f0f0;
}

.family-intro-actions .btn-edit {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  background: #4a90d9;
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.family-intro-actions .btn-edit:hover {
  background: #3a7bc8;
}

.family-intro-actions .btn-save {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  background: #f0a020;
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.family-intro-actions .btn-save:hover {
  background: #d8901a;
}
```

- [ ] **Step 2: Create `FamilyIntroModal.tsx`**

```tsx
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
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/FamilyIntroModal.tsx src/components/FamilyIntroModal.css
git commit -m "Add FamilyIntroModal component"
```

---

### Task 5: Add family intro badge to `PersonCard`

**Files:**
- Modify: `src/components/PersonCard.tsx:8-28` (Props), `src/components/PersonCard.tsx:30-49` (component), `src/components/PersonCard.tsx:213-256` (render section)
- Modify: `src/components/PersonCard.css:204-206` (append styles)

- [ ] **Step 1: Add `onShowFamilyIntro` to Props interface**

Add to the `Props` interface after `onMoveTargetPick?: (personId: string) => void;` (line 27):

```ts
interface Props {
  person: Person;
  x: number;
  y: number;
  isSpouse?: boolean;
  hasChildren: boolean;
  isCollapsed: boolean;
  hasParents: boolean;
  isParentCollapsed: boolean;
  onAddRelation: (personId: string) => void;
  onDragStart?: (personId: string, clientX: number, clientY: number) => void;
  isDragSource?: boolean;
  relationMode?: boolean;
  hasPath?: boolean;
  isOnPath?: boolean;
  isPathEnd?: boolean;
  selectMode?: boolean;
  isSelected?: boolean;
  moveTargetMode?: boolean;
  onMoveTargetPick?: (personId: string) => void;
  onShowFamilyIntro?: (personId: string) => void;
}
```

- [ ] **Step 2: Destructure `onShowFamilyIntro` in component**

Add `onShowFamilyIntro,` to the destructured props (after `onMoveTargetPick,` around line 48):

```tsx
export const PersonCard: React.FC<Props> = ({
  person,
  x,
  y,
  hasChildren,
  isCollapsed,
  hasParents,
  isParentCollapsed,
  onAddRelation,
  onDragStart,
  isDragSource,
  relationMode,
  hasPath,
  isOnPath,
  isPathEnd,
  selectMode,
  isSelected,
  moveTargetMode,
  onMoveTargetPick,
  onShowFamilyIntro,
}) => {
```

- [ ] **Step 3: Add badge rendering**

Add the badge JSX after the `hasParents` collapse button block (after line 256, before the closing `</g>`):

```tsx
      {person.familyIntro && !relationMode && !selectMode && !moveTargetMode && (
        <g
          className="card-family-intro-btn"
          onClick={(e) => {
            e.stopPropagation();
            onShowFamilyIntro?.(person.id);
          }}
        >
          <circle cx={10} cy={CARD_HEIGHT - 10} r={8} />
          <text x={10} y={CARD_HEIGHT - 6} textAnchor="middle" fontSize={9} fill="white">
            {t('familyIntroBadge')}
          </text>
        </g>
      )}
```

Note: You also need to add `useT` import. Currently PersonCard uses `useI18n` for locale. Add `useT` to the import and use it.

Update the import line (line 5):

```tsx
import { useI18n, useT } from '../i18n';
```

Add inside the component (after the existing `const locale = useI18n(...)` line, around line 51):

```tsx
  const t = useT();
```

- [ ] **Step 4: Add CSS for the badge**

Append to `src/components/PersonCard.css` (after line 206):

```css

.card-family-intro-btn circle {
  fill: #f0a020;
  stroke: white;
  stroke-width: 1.5;
  cursor: pointer;
  transition: all 0.2s;
}

.card-family-intro-btn:hover circle {
  fill: #d8901a;
}

.card-family-intro-btn text {
  pointer-events: none;
  font-weight: 600;
}

@media (pointer: coarse) {
  .card-family-intro-btn circle {
    r: 12;
  }
}
```

- [ ] **Step 5: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/PersonCard.tsx src/components/PersonCard.css
git commit -m "Add family intro badge to PersonCard"
```

---

### Task 6: Add "增加家族介绍" button to `AddPersonDialog`

**Files:**
- Modify: `src/components/AddPersonDialog.tsx:21-95`
- Modify: `src/components/AddPersonDialog.css:116-117` (after `.relation-btn.active` block)

- [ ] **Step 1: Wire up store action and add button**

In `src/components/AddPersonDialog.tsx`, add `setFamilyIntroPersonId` to the store hooks (after line 26):

```tsx
  const setFamilyIntroPersonId = useFamilyStore((s) => s.setFamilyIntroPersonId);
```

Add the "增加家族介绍" button after the `.relation-buttons` div (after line 59, before the name form-group). The full form section becomes:

```tsx
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
            <button
              type="button"
              className="add-family-intro-btn"
              onClick={() => {
                setFamilyIntroPersonId(targetPersonId, true);
                onClose();
              }}
            >
              {t('addFamilyIntro')}
            </button>
          </div>
```

(The rest of the form — name input, birth year, actions — stays the same.)

- [ ] **Step 2: Add CSS for the button**

In `src/components/AddPersonDialog.css`, add after the `.relation-btn.active` block (after line 116):

```css

.add-family-intro-btn {
  width: 100%;
  margin-top: 8px;
  padding: 10px;
  border: 1px dashed #f0a020;
  border-radius: 8px;
  background: #fffbeb;
  cursor: pointer;
  font-size: 13px;
  color: #b47800;
  transition: all 0.2s;
}

.add-family-intro-btn:hover {
  background: #fef0d0;
  border-color: #d8901a;
}
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/AddPersonDialog.tsx src/components/AddPersonDialog.css
git commit -m "Add family intro button to AddPersonDialog"
```

---

### Task 7: Wire up `FamilyIntroModal` in `FamilyTree`

**Files:**
- Modify: `src/components/FamilyTree.tsx:1-9` (imports), `src/components/FamilyTree.tsx:749-774` (PersonCard props), `src/components/FamilyTree.tsx:959-964` (modal rendering area)

- [ ] **Step 1: Import `FamilyIntroModal`**

Add import after line 6 (`import { AddPersonDialog }`):

```tsx
import { AddPersonDialog } from './AddPersonDialog';
import { FamilyIntroModal } from './FamilyIntroModal';
```

- [ ] **Step 2: Read store state and action**

Add after `const setMoveTargetMode = ...` (line 58):

```tsx
  const setFamilyIntroPersonId = useFamilyStore((s) => s.setFamilyIntroPersonId);
```

- [ ] **Step 3: Pass `onShowFamilyIntro` to `PersonCard`**

In the `cards.push(<PersonCard ... />)` call (lines 749-774), add the `onShowFamilyIntro` prop:

```tsx
      cards.push(
        <PersonCard
          key={person.id}
          person={person}
          x={px}
          y={py}
          isSpouse={pid !== unit.personId}
          hasChildren={primaryHasChildren}
          isCollapsed={unit.collapsed}
          hasParents={personHasParents}
          isParentCollapsed={!!person.parentCollapsed}
          onAddRelation={(id) => setAddingForPersonId(id)}
          onDragStart={handleCardDragStart}
          isDragSource={dragRender?.personId === person.id}
          relationMode={relationMode}
          hasPath={!!showPath}
          isOnPath={showPath ? pathSet.has(person.id) : false}
          isPathEnd={pathEndSet.has(person.id)}
          selectMode={selectMode}
          isSelected={selectedIdsSet.has(person.id)}
          moveTargetMode={moveTargetMode}
          onMoveTargetPick={(targetId) => {
            movePersonsToParent(selectedIds, targetId);
          }}
          onShowFamilyIntro={(id) => setFamilyIntroPersonId(id)}
        />
      );
```

- [ ] **Step 4: Render `FamilyIntroModal`**

Add the modal rendering after the `addingForPersonId` block (after line 964):

```tsx
      {addingForPersonId && (
        <AddPersonDialog
          targetPersonId={addingForPersonId}
          onClose={() => setAddingForPersonId(null)}
        />
      )}

      <FamilyIntroModal />
```

- [ ] **Step 5: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/FamilyTree.tsx
git commit -m "Wire FamilyIntroModal into FamilyTree"
```

---

### Task 8: Write tests

**Files:**
- Modify: `src/store/localDb.test.ts`
- Modify: `src/store/familyStore.test.ts`

- [ ] **Step 1: Add `familyIntro` validation tests to `localDb.test.ts`**

First, read the existing test file to understand the patterns used. Then add tests:

```ts
describe('familyIntro validation', () => {
  const basePerson = {
    id: 'test-1',
    name: 'Test',
    gender: 'male',
    generation: 1,
    spouseIds: [],
    childrenIds: [],
    parentIds: [],
    collapsed: false,
  };

  it('should accept a valid familyIntro string', () => {
    const data = {
      persons: { 'test-1': { ...basePerson, familyIntro: 'A noble family with long history.' } },
    };
    const result = importData(JSON.stringify(data));
    expect(result.persons['test-1'].familyIntro).toBe('A noble family with long history.');
  });

  it('should accept missing familyIntro', () => {
    const data = { persons: { 'test-1': basePerson } };
    const result = importData(JSON.stringify(data));
    expect(result.persons['test-1'].familyIntro).toBeUndefined();
  });

  it('should reject non-string familyIntro', () => {
    const data = {
      persons: { 'test-1': { ...basePerson, familyIntro: 123 } },
    };
    expect(() => importData(JSON.stringify(data))).toThrow('familyIntro must be a string');
  });
});
```

- [ ] **Step 2: Add `familyIntro` store tests to `familyStore.test.ts`**

First, read the existing test file to understand patterns. Then add tests:

```ts
describe('familyIntro', () => {
  beforeEach(() => {
    useFamilyStore.getState().reset();
  });

  it('should update familyIntro via updatePerson', () => {
    const id = useFamilyStore.getState().addPerson('Test', 'male');
    useFamilyStore.getState().updatePerson(id, { familyIntro: 'Family history text' });
    expect(useFamilyStore.getState().persons[id].familyIntro).toBe('Family history text');
  });

  it('should clear familyIntro when set to undefined', () => {
    const id = useFamilyStore.getState().addPerson('Test', 'male');
    useFamilyStore.getState().updatePerson(id, { familyIntro: 'Some text' });
    useFamilyStore.getState().updatePerson(id, { familyIntro: undefined });
    expect(useFamilyStore.getState().persons[id].familyIntro).toBeUndefined();
  });

  it('should set and clear familyIntroPersonId', () => {
    useFamilyStore.getState().setFamilyIntroPersonId('person-1');
    expect(useFamilyStore.getState().familyIntroPersonId).toBe('person-1');
    expect(useFamilyStore.getState().familyIntroEditMode).toBe(false);

    useFamilyStore.getState().setFamilyIntroPersonId('person-2', true);
    expect(useFamilyStore.getState().familyIntroPersonId).toBe('person-2');
    expect(useFamilyStore.getState().familyIntroEditMode).toBe(true);

    useFamilyStore.getState().setFamilyIntroPersonId(null);
    expect(useFamilyStore.getState().familyIntroPersonId).toBe(null);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/store/localDb.test.ts src/store/familyStore.test.ts
git commit -m "Add tests for familyIntro field and modal state"
```

---

### Task 9: Full build, lint, and test verification

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 2: Run build (type-check + production build)**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Fix any issues found**

If lint, build, or tests reveal issues, fix them and re-run until all pass.
