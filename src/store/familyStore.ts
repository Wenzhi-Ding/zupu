import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type { Person, Gender, RelationType } from '../types';
import { loadLocalData, saveLocalData, saveLocalDataImmediate, clearLocalData } from './localDb';
import type { LocalData } from './localDb';

interface TreeInfo {
  name: string;
  id: string;
  count: number;
}

interface FamilyState {
  persons: Record<string, Person>;
  selectedPersonId: string | null;
  siblingOrder: Record<string, string[]>;
  spouseOrder: Record<string, string[]>;
  anchorPersonId: string | null;
  _hydrated: boolean;

  availableTrees: TreeInfo[];
  currentTree: string | null;
  treeNames: Record<string, string>;
  showTreeManager: boolean;

  relationMode: boolean;
  relationPickedIds: [string] | [string, string] | [];
  relationPath: string[] | null;

  selectMode: boolean;
  selectedIds: string[];
  moveTargetMode: boolean;

  _dirtyAfterExport: boolean;
  markExported: () => void;

  addPerson: (name: string, gender: Gender, birthYear?: number) => string;
  removePerson: (id: string) => void;
  updatePerson: (id: string, patch: Partial<Pick<Person, 'name' | 'gender' | 'birthYear' | 'deathYear' | 'bio' | 'title'>>) => void;
  setGeneration: (personId: string, newGeneration: number) => void;
  addRelation: (fromId: string, relationType: RelationType, newPersonName: string, newPersonGender: Gender, newPersonBirthYear?: number) => string;
  addRelationToExisting: (fromId: string, relationType: RelationType, targetId: string) => void;
  removeSpecificRelation: (personId: string, relType: 'parent' | 'spouse' | 'child', targetId: string) => void;
  replaceRelation: (personId: string, relType: 'parent' | 'spouse' | 'child', oldTargetId: string, newTargetId: string) => void;
  toggleCollapse: (id: string) => void;
  toggleParentCollapse: (id: string) => void;
  setSiblingOrder: (parentId: string, orderedChildIds: string[]) => void;
  setSpouseOrder: (personId: string, orderedSpouseIds: string[]) => void;
  selectPerson: (id: string | null) => void;
  getPersonById: (id: string) => Person | undefined;
  getAllPersons: () => Person[];
  reset: () => void;
  toggleRelationMode: () => void;
  pickRelationNode: (id: string) => void;
  toggleSelectMode: () => void;
  toggleSelectPerson: (id: string) => void;
  setSelectedIds: (ids: string[]) => void;
  clearSelection: () => void;
  removePersons: (ids: string[]) => void;
  movePersonsToParent: (personIds: string[], targetParentId: string) => void;
  setMoveTargetMode: (mode: boolean) => void;
  fetchTrees: () => Promise<void>;
  loadTree: (nameOrId: string | null) => Promise<void>;
  setTreeName: (rootName: string, treeName: string) => void;
  loadSampleData: (data: LocalData, treeNameMap: Record<string, string>) => void;
  deleteTree: (rootName: string) => void;
  setShowTreeManager: (show: boolean) => void;
}

function createPerson(name: string, gender: Gender, birthYear?: number, generation?: number): Person {
  return {
    id: uuid(),
    name,
    gender,
    birthYear,
    generation: generation ?? 1,
    spouseIds: [],
    childrenIds: [],
    parentIds: [],
    collapsed: false,
  };
}

function syncGenerationWithSpouses(
  persons: Record<string, Person>,
  personId: string,
  newGeneration: number,
  visited: Set<string>,
): void {
  if (visited.has(personId)) return;
  visited.add(personId);

  const person = persons[personId];
  if (!person) return;

  persons[personId] = { ...person, generation: newGeneration };

  for (const spouseId of person.spouseIds) {
    if (!visited.has(spouseId) && persons[spouseId]) {
      visited.add(spouseId);
      persons[spouseId] = { ...persons[spouseId], generation: newGeneration };
    }
  }
}

function bfsShortestPath(persons: Record<string, Person>, startId: string, endId: string): string[] | null {
  if (startId === endId) return [startId];
  const queue: string[] = [startId];
  const prev = new Map<string, string>();
  prev.set(startId, '');

  while (queue.length > 0) {
    const current = queue.shift()!;
    const person = persons[current];
    if (!person) continue;

    const neighbors = [...person.parentIds, ...person.childrenIds, ...person.spouseIds];
    for (const nid of neighbors) {
      if (!persons[nid] || prev.has(nid)) continue;
      prev.set(nid, current);
      if (nid === endId) {
        const path: string[] = [];
        let node = endId;
        while (node !== '') {
          path.push(node);
          node = prev.get(node)!;
        }
        return path.reverse();
      }
      queue.push(nid);
    }
  }
  return null;
}

function persistState(state: FamilyState): void {
  useFamilyStore.setState({ _dirtyAfterExport: true });
  saveLocalData({
    persons: state.persons,
    siblingOrder: state.siblingOrder,
    spouseOrder: state.spouseOrder,
    selectedPersonId: state.selectedPersonId,
    currentTree: state.currentTree,
    treeNames: state.treeNames,
  });
}

function deriveTreeList(persons: Record<string, Person>, treeNames: Record<string, string>): TreeInfo[] {
  const visited = new Set<string>();
  const components: { rootName: string; count: number }[] = [];

  for (const startId of Object.keys(persons)) {
    if (visited.has(startId)) continue;

    const queue = [startId];
    const members: string[] = [];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      const p = persons[cur];
      if (!p) continue;
      members.push(cur);
      for (const id of p.parentIds) if (!visited.has(id)) queue.push(id);
      for (const id of p.childrenIds) if (!visited.has(id)) queue.push(id);
      for (const id of p.spouseIds) if (!visited.has(id)) queue.push(id);
    }

    let rootName: string | null = null;
    for (const id of members) {
      const p = persons[id];
      if (p && p.parentIds.length === 0) {
        rootName = p.name;
        break;
      }
    }
    if (!rootName && members.length > 0) {
      rootName = persons[members[0]]?.name ?? null;
    }

    if (rootName) {
      components.push({ rootName, count: members.length });
    }
  }

  return components.map((c) => ({
    name: treeNames[c.rootName] ?? c.rootName,
    id: c.rootName,
    count: c.count,
  }));
}

function findComponentByRootName(persons: Record<string, Person>, rootName: string): string[] {
  for (const startId of Object.keys(persons)) {
    const visited = new Set<string>();
    const queue = [startId];
    const members: string[] = [];
    let foundRoot: string | null = null;

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      const p = persons[cur];
      if (!p) continue;
      members.push(cur);
      if (!foundRoot && p.parentIds.length === 0) foundRoot = p.name;
      for (const id of p.parentIds) if (!visited.has(id)) queue.push(id);
      for (const id of p.childrenIds) if (!visited.has(id)) queue.push(id);
      for (const id of p.spouseIds) if (!visited.has(id)) queue.push(id);
    }

    if (foundRoot === rootName) return members;
  }
  return [];
}

export const useFamilyStore = create<FamilyState>()(
  subscribeWithSelector(
    (set, get) => ({
      persons: {},
      selectedPersonId: null,
      siblingOrder: {},
      spouseOrder: {},
      anchorPersonId: null,
      _hydrated: false,
      availableTrees: [],
      currentTree: null,
      treeNames: {},
      showTreeManager: false,
      relationMode: false,
      relationPickedIds: [],
      relationPath: null,

      selectMode: false,
      selectedIds: [],
      moveTargetMode: false,

      _dirtyAfterExport: false,
      markExported: () => set({ _dirtyAfterExport: false }),

      addPerson: (name, gender, birthYear) => {
        const person = createPerson(name, gender, birthYear, 1);
        set((state) => {
          const next = {
            persons: { ...state.persons, [person.id]: person },
          };
          persistState({ ...state, ...next });
          return next;
        });
        return person.id;
      },

      removePerson: (id) => {
        set((state) => {
          const person = state.persons[id];
          if (!person) return state;

          const next = { ...state.persons };

          for (const spouseId of person.spouseIds) {
            if (next[spouseId]) {
              next[spouseId] = {
                ...next[spouseId],
                spouseIds: next[spouseId].spouseIds.filter((s) => s !== id),
              };
            }
          }
          for (const childId of person.childrenIds) {
            if (next[childId]) {
              next[childId] = {
                ...next[childId],
                parentIds: next[childId].parentIds.filter((p) => p !== id),
              };
            }
          }
          for (const parentId of person.parentIds) {
            if (next[parentId]) {
              next[parentId] = {
                ...next[parentId],
                childrenIds: next[parentId].childrenIds.filter((c) => c !== id),
              };
            }
          }

          delete next[id];
          const update = {
            persons: next,
            selectedPersonId: state.selectedPersonId === id ? null : state.selectedPersonId,
          };
          persistState({ ...state, ...update });
          return update;
        });
      },

      updatePerson: (id, patch) => {
        set((state) => {
          const person = state.persons[id];
          if (!person) return state;
          const update = {
            persons: {
              ...state.persons,
              [id]: { ...person, ...patch },
            },
          };
          persistState({ ...state, ...update });
          return update;
        });
      },

      setGeneration: (personId, newGeneration) => {
        set((state) => {
          const person = state.persons[personId];
          if (!person) return state;

          const currentGen = person.generation ?? 1;
          if (newGeneration === currentGen) return state;

          const next = { ...state.persons };
          for (const key of Object.keys(next)) {
            next[key] = { ...next[key] };
          }

          const visited = new Set<string>();
          syncGenerationWithSpouses(next, personId, newGeneration, visited);

          let minGen = Infinity;
          for (const p of Object.values(next)) {
            if (p.generation < minGen) minGen = p.generation;
          }
          if (minGen < 1) {
            const shift = 1 - minGen;
            for (const key of Object.keys(next)) {
              next[key] = { ...next[key], generation: next[key].generation + shift };
            }
          }

          const update = { persons: next, anchorPersonId: personId };
          persistState({ ...state, ...update });
          return update;
        });
      },

      addRelation: (fromId, relationType, newName, newGender, newBirthYear) => {
        let newPersonId = '';
        set((state) => {
          const from = state.persons[fromId];
          if (!from) return state;

          const fromGen = from.generation ?? 1;
          let newGen: number;
          switch (relationType) {
            case 'father':
            case 'mother':
              newGen = fromGen - 1;
              break;
            case 'son':
            case 'daughter':
              newGen = fromGen + 1;
              break;
            case 'husband':
            case 'wife':
              newGen = fromGen;
              break;
          }

          const newPerson = createPerson(newName, newGender, newBirthYear, newGen);
          newPersonId = newPerson.id;
          const next = { ...state.persons };
          next[newPerson.id] = newPerson;

          switch (relationType) {
            case 'father':
            case 'mother': {
              next[fromId] = { ...from, parentIds: [...from.parentIds, newPerson.id] };
              next[newPerson.id] = { ...newPerson, childrenIds: [fromId] };
              break;
            }
            case 'son':
            case 'daughter': {
              next[fromId] = { ...from, childrenIds: [...from.childrenIds, newPerson.id] };
              next[newPerson.id] = { ...newPerson, parentIds: [fromId] };
              for (const spouseId of from.spouseIds) {
                if (next[spouseId]) {
                  next[spouseId] = {
                    ...next[spouseId],
                    childrenIds: [...next[spouseId].childrenIds, newPerson.id],
                  };
                  next[newPerson.id] = {
                    ...next[newPerson.id],
                    parentIds: [...next[newPerson.id].parentIds, spouseId],
                  };
                }
              }
              break;
            }
            case 'husband':
            case 'wife': {
              next[fromId] = { ...from, spouseIds: [...from.spouseIds, newPerson.id] };
              next[newPerson.id] = { ...newPerson, spouseIds: [fromId] };
              break;
            }
          }

          const update = { persons: next, anchorPersonId: fromId };
          persistState({ ...state, ...update });
          return update;
        });
        return newPersonId;
      },

      addRelationToExisting: (fromId, relationType, targetId) => {
        set((state) => {
          const from = state.persons[fromId];
          const target = state.persons[targetId];
          if (!from || !target) return state;

          const next = { ...state.persons };
          for (const key of Object.keys(next)) {
            next[key] = { ...next[key] };
          }

          const fromGen = from.generation ?? 1;

          switch (relationType) {
            case 'father':
            case 'mother': {
              if (!from.parentIds.includes(targetId)) {
                next[fromId] = { ...next[fromId], parentIds: [...from.parentIds, targetId] };
                next[targetId] = { ...next[targetId], childrenIds: [...target.childrenIds, fromId] };
                const expectedGen = fromGen - 1;
                const targetGen = target.generation ?? 1;
                if (targetGen !== expectedGen) {
                  const visited = new Set<string>();
                  syncGenerationWithSpouses(next, targetId, expectedGen, visited);
                }
              }
              break;
            }
            case 'son':
            case 'daughter': {
              if (!from.childrenIds.includes(targetId)) {
                next[fromId] = { ...next[fromId], childrenIds: [...from.childrenIds, targetId] };
                next[targetId] = { ...next[targetId], parentIds: [...target.parentIds, fromId] };
                const expectedGen = fromGen + 1;
                const targetGen = target.generation ?? 1;
                if (targetGen !== expectedGen) {
                  const visited = new Set<string>();
                  syncGenerationWithSpouses(next, targetId, expectedGen, visited);
                }
              }
              break;
            }
            case 'husband':
            case 'wife': {
              if (!from.spouseIds.includes(targetId)) {
                next[fromId] = { ...next[fromId], spouseIds: [...from.spouseIds, targetId] };
                next[targetId] = { ...next[targetId], spouseIds: [...target.spouseIds, fromId] };
                const targetGen = target.generation ?? 1;
                if (targetGen !== fromGen) {
                  const visited = new Set<string>();
                  syncGenerationWithSpouses(next, targetId, fromGen, visited);
                }
              }
              break;
            }
          }

          const update = { persons: next, anchorPersonId: fromId };
          persistState({ ...state, ...update });
          return update;
        });
      },

      removeSpecificRelation: (personId, relType, targetId) => {
        set((state) => {
          const person = state.persons[personId];
          const target = state.persons[targetId];
          if (!person || !target) return state;

          const next = { ...state.persons };

          switch (relType) {
            case 'parent': {
              next[personId] = { ...person, parentIds: person.parentIds.filter((id) => id !== targetId) };
              next[targetId] = { ...target, childrenIds: target.childrenIds.filter((id) => id !== personId) };
              break;
            }
            case 'child': {
              next[personId] = { ...person, childrenIds: person.childrenIds.filter((id) => id !== targetId) };
              next[targetId] = { ...target, parentIds: target.parentIds.filter((id) => id !== personId) };
              break;
            }
            case 'spouse': {
              next[personId] = { ...person, spouseIds: person.spouseIds.filter((id) => id !== targetId) };
              next[targetId] = { ...target, spouseIds: target.spouseIds.filter((id) => id !== personId) };
              break;
            }
          }

          const update = { persons: next, anchorPersonId: personId };
          persistState({ ...state, ...update });
          return update;
        });
      },

      replaceRelation: (personId, relType, oldTargetId, newTargetId) => {
        if (oldTargetId === newTargetId) return;
        const { removeSpecificRelation, addRelationToExisting } = get();
        removeSpecificRelation(personId, relType, oldTargetId);
        const relMap: Record<string, RelationType> = { parent: 'father', child: 'son', spouse: 'husband' };
        addRelationToExisting(personId, relMap[relType], newTargetId);
      },

      toggleCollapse: (id) => {
        set((state) => {
          const person = state.persons[id];
          if (!person) return state;
          const update = {
            anchorPersonId: id,
            persons: {
              ...state.persons,
              [id]: { ...person, collapsed: !person.collapsed },
            },
          };
          persistState({ ...state, ...update });
          return update;
        });
      },

      toggleParentCollapse: (id) => {
        set((state) => {
          const person = state.persons[id];
          if (!person) return state;
          const update = {
            anchorPersonId: id,
            persons: {
              ...state.persons,
              [id]: { ...person, parentCollapsed: !person.parentCollapsed },
            },
          };
          persistState({ ...state, ...update });
          return update;
        });
      },

      setSiblingOrder: (parentId, orderedChildIds) => {
        set((state) => {
          const update = {
            siblingOrder: { ...state.siblingOrder, [parentId]: orderedChildIds },
          };
          persistState({ ...state, ...update });
          return update;
        });
      },

      setSpouseOrder: (personId, orderedSpouseIds) => {
        set((state) => {
          const update = {
            spouseOrder: { ...state.spouseOrder, [personId]: orderedSpouseIds },
          };
          persistState({ ...state, ...update });
          return update;
        });
      },

      selectPerson: (id) => {
        set((state) => {
          const update = { selectedPersonId: id };
          persistState({ ...state, ...update });
          return update;
        });
      },

      getPersonById: (id) => get().persons[id],

      getAllPersons: () => Object.values(get().persons),

      reset: () => {
        clearLocalData();
        set({ persons: {}, selectedPersonId: null, siblingOrder: {}, spouseOrder: {}, relationMode: false, relationPickedIds: [], relationPath: null, currentTree: null, availableTrees: [], treeNames: {}, showTreeManager: false, _dirtyAfterExport: false, selectMode: false, selectedIds: [], moveTargetMode: false });
      },

      toggleRelationMode: () => {
        set((state) => ({
          relationMode: !state.relationMode,
          relationPickedIds: [] as FamilyState['relationPickedIds'],
          relationPath: null,
        }));
      },

      pickRelationNode: (id) => {
        set((state) => {
          if (!state.relationMode) return state;
          if (state.relationPath) {
            return { relationPickedIds: [id] as [string], relationPath: null };
          }
          if (state.relationPickedIds.length === 0) {
            return { relationPickedIds: [id] as [string] };
          }
          if (state.relationPickedIds.length === 1) {
            if (state.relationPickedIds[0] === id) return state;
            const path = bfsShortestPath(state.persons, state.relationPickedIds[0], id);
            return {
              relationPickedIds: [state.relationPickedIds[0], id] as [string, string],
              relationPath: path,
            };
          }
          return state;
        });
      },

      toggleSelectMode: () => {
        set((state) => ({
          selectMode: !state.selectMode,
          selectedIds: [] as string[],
          moveTargetMode: false,
          ...(state.selectMode ? {} : {
            relationMode: false,
            relationPickedIds: [] as FamilyState['relationPickedIds'],
            relationPath: null as string[] | null,
          }),
        }));
      },

      toggleSelectPerson: (id) => {
        set((state) => {
          if (!state.selectMode) return state;
          const idx = state.selectedIds.indexOf(id);
          const next = idx >= 0
            ? state.selectedIds.filter((sid) => sid !== id)
            : [...state.selectedIds, id];
          return { selectedIds: next };
        });
      },

      setSelectedIds: (ids) => {
        set({ selectedIds: ids });
      },

      clearSelection: () => {
        set({ selectedIds: [], moveTargetMode: false });
      },

      removePersons: (ids) => {
        set((state) => {
          const idSet = new Set(ids);
          const next = { ...state.persons };

          for (const id of ids) {
            const person = next[id];
            if (!person) continue;

            for (const spouseId of person.spouseIds) {
              if (next[spouseId]) {
                next[spouseId] = {
                  ...next[spouseId],
                  spouseIds: next[spouseId].spouseIds.filter((s) => s !== id),
                };
              }
            }
            for (const childId of person.childrenIds) {
              if (next[childId]) {
                next[childId] = {
                  ...next[childId],
                  parentIds: next[childId].parentIds.filter((p) => p !== id),
                };
              }
            }
            for (const parentId of person.parentIds) {
              if (next[parentId]) {
                next[parentId] = {
                  ...next[parentId],
                  childrenIds: next[parentId].childrenIds.filter((c) => c !== id),
                };
              }
            }

            delete next[id];
          }

          const selectedPersonId = idSet.has(state.selectedPersonId ?? '') ? null : state.selectedPersonId;
          const update = {
            persons: next,
            selectedPersonId,
            selectedIds: [] as string[],
            selectMode: false,
            moveTargetMode: false,
          };
          persistState({ ...state, ...update });
          return update;
        });
      },

      movePersonsToParent: (personIds, targetParentId) => {
        set((state) => {
          const next = { ...state.persons };
          for (const key of Object.keys(next)) {
            next[key] = { ...next[key] };
          }

          const targetParent = next[targetParentId];
          if (!targetParent) return state;
          const targetGen = targetParent.generation ?? 1;

          for (const pid of personIds) {
            const person = next[pid];
            if (!person || pid === targetParentId) continue;

            for (const oldParentId of person.parentIds) {
              if (next[oldParentId]) {
                next[oldParentId] = {
                  ...next[oldParentId],
                  childrenIds: next[oldParentId].childrenIds.filter((c) => c !== pid),
                };
              }
            }

            if (!next[targetParentId].childrenIds.includes(pid)) {
              next[targetParentId] = {
                ...next[targetParentId],
                childrenIds: [...next[targetParentId].childrenIds, pid],
              };
            }

            next[pid] = {
              ...next[pid],
              parentIds: [targetParentId],
            };

            const visited = new Set<string>();
            syncGenerationWithSpouses(next, pid, targetGen + 1, visited);
          }

          let minGen = Infinity;
          for (const p of Object.values(next)) {
            if (p.generation < minGen) minGen = p.generation;
          }
          if (minGen < 1) {
            const shift = 1 - minGen;
            for (const key of Object.keys(next)) {
              next[key] = { ...next[key], generation: next[key].generation + shift };
            }
          }

          const update = {
            persons: next,
            selectedIds: [] as string[],
            selectMode: false,
            moveTargetMode: false,
            anchorPersonId: personIds[0] ?? null,
          };
          persistState({ ...state, ...update });
          return update;
        });
      },

      setMoveTargetMode: (mode) => {
        set({ moveTargetMode: mode });
      },

      setTreeName: (rootName, treeName) => {
        set((state) => {
          const next = { ...state.treeNames, [rootName]: treeName };
          const update = { treeNames: next, availableTrees: deriveTreeList(state.persons, next) };
          persistState({ ...state, ...update });
          return update;
        });
      },

      fetchTrees: async () => {
        const state = get();
        const trees = deriveTreeList(state.persons, state.treeNames);
        set({ availableTrees: trees });
      },

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
        };
        set(update);
        saveLocalDataImmediate({
          persons: data.persons,
          siblingOrder: data.siblingOrder,
          spouseOrder: data.spouseOrder,
          selectedPersonId: data.selectedPersonId,
          currentTree: null,
          treeNames: treeNameMap,
        });
      },

      deleteTree: (rootName) => {
        set((state) => {
          const memberIds = findComponentByRootName(state.persons, rootName);
          if (memberIds.length === 0) return state;

          const next = { ...state.persons };
          for (const id of memberIds) delete next[id];

          const nextTreeNames = { ...state.treeNames };
          delete nextTreeNames[rootName];

          const nextSiblingOrder = { ...state.siblingOrder };
          const nextSpouseOrder = { ...state.spouseOrder };
          for (const id of memberIds) {
            delete nextSiblingOrder[id];
            delete nextSpouseOrder[id];
          }

          const update = {
            persons: next,
            treeNames: nextTreeNames,
            siblingOrder: nextSiblingOrder,
            spouseOrder: nextSpouseOrder,
            selectedPersonId: memberIds.includes(state.selectedPersonId ?? '') ? null : state.selectedPersonId,
            currentTree: state.currentTree === rootName ? null : state.currentTree,
            availableTrees: deriveTreeList(next, nextTreeNames),
          };
          persistState({ ...state, ...update });
          return update;
        });
      },

      setShowTreeManager: (show) => {
        set({ showTreeManager: show });
      },

      loadTree: async (nameOrId) => {
        const state = get();
        if (!nameOrId) {
          set({
            currentTree: null,
            anchorPersonId: null,
            relationMode: false,
            relationPickedIds: [],
            relationPath: null,
          });
          persistState({ ...state, currentTree: null });
          get().fetchTrees();
          return;
        }

        set({
          currentTree: nameOrId,
          anchorPersonId: null,
          relationMode: false,
          relationPickedIds: [],
          relationPath: null,
        });
        persistState({ ...state, currentTree: nameOrId });
        get().fetchTrees();
      },
    })
  )
);

const saved = loadLocalData();
const hasData = Object.keys(saved.persons).length > 0;
useFamilyStore.setState({
  persons: saved.persons,
  selectedPersonId: saved.selectedPersonId,
  siblingOrder: saved.siblingOrder,
  spouseOrder: saved.spouseOrder,
  currentTree: saved.currentTree,
  treeNames: saved.treeNames,
  availableTrees: deriveTreeList(saved.persons, saved.treeNames),
  showTreeManager: !hasData,
  _hydrated: true,
});
