import type { Person } from '../types';

const STORAGE_KEY = 'genealogy_data';

export interface LocalData {
  persons: Record<string, Person>;
  siblingOrder: Record<string, string[]>;
  spouseOrder: Record<string, string[]>;
  selectedPersonId: string | null;
  currentTree: string | null;
  treeNames: Record<string, string>;
}

const EMPTY_DATA: LocalData = {
  persons: {},
  siblingOrder: {},
  spouseOrder: {},
  selectedPersonId: null,
  currentTree: null,
  treeNames: {},
};

export function loadLocalData(): LocalData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_DATA };
    const parsed = JSON.parse(raw) as Partial<LocalData>;
    return {
      persons: parsed.persons ?? {},
      siblingOrder: parsed.siblingOrder ?? {},
      spouseOrder: parsed.spouseOrder ?? {},
      selectedPersonId: parsed.selectedPersonId ?? null,
      currentTree: parsed.currentTree ?? null,
      treeNames: parsed.treeNames ?? {},
    };
  } catch {
    return { ...EMPTY_DATA };
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveLocalData(data: LocalData): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full — silently fail, data still in memory
    }
  }, 300);
}

export function saveLocalDataImmediate(data: LocalData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full
  }
}

export function clearLocalData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportData(data: LocalData): string {
  return JSON.stringify(data, null, 2);
}

export function importData(json: string): LocalData {
  const parsed = JSON.parse(json) as Partial<LocalData>;
  if (!parsed.persons || typeof parsed.persons !== 'object') {
    throw new Error('Invalid data format: missing persons');
  }
  return {
    persons: parsed.persons,
    siblingOrder: parsed.siblingOrder ?? {},
    spouseOrder: parsed.spouseOrder ?? {},
    selectedPersonId: parsed.selectedPersonId ?? null,
    currentTree: parsed.currentTree ?? null,
    treeNames: parsed.treeNames ?? {},
  };
}
