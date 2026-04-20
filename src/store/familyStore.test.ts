import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Person } from '../types';

let uuidCounter = 0;
vi.mock('uuid', () => ({
  v4: () => `test-uuid-${++uuidCounter}`,
}));

vi.mock('./localDb', () => ({
  loadLocalData: vi.fn(() => ({
    persons: {},
    siblingOrder: {},
    spouseOrder: {},
    selectedPersonId: null,
    currentTree: null,
    treeNames: {},
  })),
  saveLocalData: vi.fn(),
  saveLocalDataImmediate: vi.fn(),
  clearLocalData: vi.fn(),
}));

// Import after mocks are set up
const { useFamilyStore } = await import('./familyStore');

function getState() {
  return useFamilyStore.getState();
}

describe('useFamilyStore', () => {
  beforeEach(() => {
    uuidCounter = 0;
    getState().reset();
  });

  describe('addPerson', () => {
    it('creates person with correct fields', () => {
      const id = getState().addPerson('John', 'male', 1980);
      const person = getState().persons[id];

      expect(person).toBeDefined();
      expect(person.name).toBe('John');
      expect(person.gender).toBe('male');
      expect(person.birthYear).toBe(1980);
      expect(person.generation).toBe(1);
      expect(person.spouseIds).toEqual([]);
      expect(person.childrenIds).toEqual([]);
      expect(person.parentIds).toEqual([]);
      expect(person.collapsed).toBe(false);
    });

    it('assigns uuid and default generation 1', () => {
      const id1 = getState().addPerson('Alice', 'female');
      const id2 = getState().addPerson('Bob', 'male');

      expect(id1).toBe('test-uuid-1');
      expect(id2).toBe('test-uuid-2');
      expect(getState().persons[id1].generation).toBe(1);
      expect(getState().persons[id2].generation).toBe(1);
    });
  });

  describe('removePerson', () => {
    it('removes person from store', () => {
      const id = getState().addPerson('John', 'male');
      getState().removePerson(id);

      expect(getState().persons[id]).toBeUndefined();
    });

    it('cleans up spouse/parent/child references in related persons', () => {
      // Set up: father -> child, with mother as spouse of father
      const fatherId = getState().addPerson('Father', 'male');
      const motherId = getState().addRelation(fatherId, 'wife', 'Mother', 'female');
      const childId = getState().addRelation(fatherId, 'son', 'Child', 'male');

      // Verify setup
      expect(getState().persons[childId].parentIds).toContain(fatherId);
      expect(getState().persons[childId].parentIds).toContain(motherId);
      expect(getState().persons[fatherId].childrenIds).toContain(childId);
      expect(getState().persons[motherId].childrenIds).toContain(childId);
      expect(getState().persons[fatherId].spouseIds).toContain(motherId);
      expect(getState().persons[motherId].spouseIds).toContain(fatherId);

      // Remove father
      getState().removePerson(fatherId);

      // Father should be gone
      expect(getState().persons[fatherId]).toBeUndefined();

      // Mother's spouse reference should be cleaned up
      expect(getState().persons[motherId].spouseIds).not.toContain(fatherId);

      // Child's parent reference to father should be cleaned up
      expect(getState().persons[childId].parentIds).not.toContain(fatherId);
      // But child's parent reference to mother should remain
      expect(getState().persons[childId].parentIds).toContain(motherId);
    });
  });

  describe('updatePerson', () => {
    it('patches specific fields', () => {
      const id = getState().addPerson('John', 'male', 1980);
      getState().updatePerson(id, { name: 'Johnny', birthYear: 1981 });

      const person = getState().persons[id];
      expect(person.name).toBe('Johnny');
      expect(person.birthYear).toBe(1981);
      expect(person.gender).toBe('male'); // unchanged
      expect(person.generation).toBe(1); // unchanged
    });
  });

  describe('addRelation', () => {
    it('father: creates parent with correct generation', () => {
      const childId = getState().addPerson('Child', 'male');
      const fatherId = getState().addRelation(childId, 'father', 'Father', 'male');

      expect(getState().persons[fatherId]).toBeDefined();
      expect(getState().persons[fatherId].name).toBe('Father');
      expect(getState().persons[fatherId].gender).toBe('male');
      expect(getState().persons[fatherId].generation).toBe(0); // child gen 1 - 1

      // Bidirectional links
      expect(getState().persons[childId].parentIds).toContain(fatherId);
      expect(getState().persons[fatherId].childrenIds).toContain(childId);
    });

    it('son: creates child and adds to spouse childrenIds too', () => {
      const fatherId = getState().addPerson('Father', 'male');
      const motherId = getState().addRelation(fatherId, 'wife', 'Mother', 'female');
      const sonId = getState().addRelation(fatherId, 'son', 'Son', 'male');

      expect(getState().persons[sonId]).toBeDefined();
      expect(getState().persons[sonId].name).toBe('Son');
      expect(getState().persons[sonId].generation).toBe(2); // father gen 1 + 1

      // Bidirectional links to both parents
      expect(getState().persons[sonId].parentIds).toContain(fatherId);
      expect(getState().persons[sonId].parentIds).toContain(motherId);
      expect(getState().persons[fatherId].childrenIds).toContain(sonId);
      expect(getState().persons[motherId].childrenIds).toContain(sonId);
    });

    it('husband: creates spouse at same generation', () => {
      const wifeId = getState().addPerson('Wife', 'female');
      const husbandId = getState().addRelation(wifeId, 'husband', 'Husband', 'male');

      expect(getState().persons[husbandId]).toBeDefined();
      expect(getState().persons[husbandId].name).toBe('Husband');
      expect(getState().persons[husbandId].generation).toBe(1); // same as wife

      // Bidirectional spouse links
      expect(getState().persons[wifeId].spouseIds).toContain(husbandId);
      expect(getState().persons[husbandId].spouseIds).toContain(wifeId);
    });
  });

  describe('addRelationToExisting', () => {
    it('links two existing persons bidirectionally', () => {
      const fatherId = getState().addPerson('Father', 'male');
      const childId = getState().addPerson('Child', 'male');

      getState().addRelationToExisting(childId, 'father', fatherId);

      expect(getState().persons[childId].parentIds).toContain(fatherId);
      expect(getState().persons[fatherId].childrenIds).toContain(childId);
    });
  });

  describe('removeSpecificRelation', () => {
    it('removes parent link', () => {
      const childId = getState().addPerson('Child', 'male');
      const fatherId = getState().addRelation(childId, 'father', 'Father', 'male');

      expect(getState().persons[childId].parentIds).toContain(fatherId);

      getState().removeSpecificRelation(childId, 'parent', fatherId);

      expect(getState().persons[childId].parentIds).not.toContain(fatherId);
      expect(getState().persons[fatherId].childrenIds).not.toContain(childId);
    });

    it('removes spouse link', () => {
      const husbandId = getState().addPerson('Husband', 'male');
      const wifeId = getState().addRelation(husbandId, 'wife', 'Wife', 'female');

      expect(getState().persons[husbandId].spouseIds).toContain(wifeId);
      expect(getState().persons[wifeId].spouseIds).toContain(husbandId);

      getState().removeSpecificRelation(husbandId, 'spouse', wifeId);

      expect(getState().persons[husbandId].spouseIds).not.toContain(wifeId);
      expect(getState().persons[wifeId].spouseIds).not.toContain(husbandId);
    });
  });

  describe('toggleCollapse', () => {
    it('flips collapsed state', () => {
      const id = getState().addPerson('John', 'male');

      expect(getState().persons[id].collapsed).toBe(false);

      getState().toggleCollapse(id);
      expect(getState().persons[id].collapsed).toBe(true);

      getState().toggleCollapse(id);
      expect(getState().persons[id].collapsed).toBe(false);
    });
  });

  describe('selectPerson', () => {
    it('sets selectedPersonId', () => {
      const id = getState().addPerson('John', 'male');

      getState().selectPerson(id);
      expect(getState().selectedPersonId).toBe(id);

      getState().selectPerson(null);
      expect(getState().selectedPersonId).toBeNull();
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      const id = getState().addPerson('John', 'male');
      getState().selectPerson(id);
      getState().toggleCollapse(id);

      getState().reset();

      expect(getState().persons).toEqual({});
      expect(getState().selectedPersonId).toBeNull();
      expect(getState().siblingOrder).toEqual({});
      expect(getState().spouseOrder).toEqual({});
      expect(getState().relationMode).toBe(false);
      expect(getState().relationPickedIds).toEqual([]);
      expect(getState().relationPath).toBeNull();
      expect(getState().selectMode).toBe(false);
      expect(getState().selectedIds).toEqual([]);
    });
  });

  describe('pickRelationNode', () => {
    it('finds shortest path between two persons via BFS', () => {
      // Build a family tree:
      // Grandfather -> Father -> Child
      //             -> Uncle
      const grandfatherId = getState().addPerson('Grandfather', 'male');
      const fatherId = getState().addRelation(grandfatherId, 'son', 'Father', 'male');
      const uncleId = getState().addRelation(grandfatherId, 'son', 'Uncle', 'male');
      const childId = getState().addRelation(fatherId, 'son', 'Child', 'male');

      // Enable relation mode and pick two nodes
      getState().toggleRelationMode();

      // Pick grandfather first
      getState().pickRelationNode(grandfatherId);
      expect(getState().relationPickedIds).toEqual([grandfatherId]);
      expect(getState().relationPath).toBeNull();

      // Pick child second - path should be grandfather -> father -> child
      getState().pickRelationNode(childId);
      expect(getState().relationPickedIds).toEqual([grandfatherId, childId]);
      expect(getState().relationPath).toEqual([grandfatherId, fatherId, childId]);
    });

    it('finds path through spouse', () => {
      const husbandId = getState().addPerson('Husband', 'male');
      const wifeId = getState().addRelation(husbandId, 'wife', 'Wife', 'female');

      getState().toggleRelationMode();
      getState().pickRelationNode(husbandId);
      getState().pickRelationNode(wifeId);

      expect(getState().relationPath).toEqual([husbandId, wifeId]);
    });
  });

  describe('toggleSelectMode / toggleSelectPerson', () => {
    it('toggles selection mode and manages selected ids', () => {
      const id1 = getState().addPerson('Person1', 'male');
      const id2 = getState().addPerson('Person2', 'female');

      expect(getState().selectMode).toBe(false);

      getState().toggleSelectMode();
      expect(getState().selectMode).toBe(true);
      expect(getState().selectedIds).toEqual([]);

      getState().toggleSelectPerson(id1);
      expect(getState().selectedIds).toEqual([id1]);

      getState().toggleSelectPerson(id2);
      expect(getState().selectedIds).toEqual([id1, id2]);

      getState().toggleSelectPerson(id1);
      expect(getState().selectedIds).toEqual([id2]);

      getState().toggleSelectMode();
      expect(getState().selectMode).toBe(false);
      expect(getState().selectedIds).toEqual([]);
    });

    it('does not select person when not in select mode', () => {
      const id = getState().addPerson('Person', 'male');

      getState().toggleSelectPerson(id);
      expect(getState().selectedIds).toEqual([]);
    });
  });
});
