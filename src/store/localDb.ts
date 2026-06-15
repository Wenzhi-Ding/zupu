import type { Person, Gender, CalendarType } from '../types';
import type { ImageMeta } from '../types';

const STORAGE_KEY = 'genealogy_data';

const VALID_GENDERS = new Set<string>(['male', 'female', 'unknown']);
const VALID_CALENDAR_TYPES = new Set<string>(['solar', 'lunar']);
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isSafeKey(key: string): boolean {
  return !DANGEROUS_KEYS.has(key);
}

function validatePerson(raw: unknown, key: string): Person {
  if (!isPlainObject(raw)) {
    throw new Error(`Invalid person entry "${key}": expected object`);
  }

  const { id, name, gender, birthYear, birthDate, deathYear, deathDate, birthCalendarType, deathCalendarType, title, generation,
          spouseIds, childrenIds, parentIds, collapsed, parentCollapsed, bio,
          avatarImageId, galleryImageIds, familyIntro } = raw;

  if (typeof id !== 'string' || !id) {
    throw new Error(`Invalid person "${key}": id must be a non-empty string`);
  }
  if (typeof name !== 'string') {
    throw new Error(`Invalid person "${key}": name must be a string`);
  }
  if (typeof gender !== 'string' || !VALID_GENDERS.has(gender)) {
    throw new Error(`Invalid person "${key}": gender must be male|female|unknown`);
  }
  if (typeof generation !== 'number' || !Number.isFinite(generation)) {
    throw new Error(`Invalid person "${key}": generation must be a finite number`);
  }

  if (birthYear !== undefined && (typeof birthYear !== 'number' || !Number.isFinite(birthYear))) {
    throw new Error(`Invalid person "${key}": birthYear must be a finite number if provided`);
  }
  if (birthDate !== undefined && typeof birthDate !== 'string') {
    throw new Error(`Invalid person "${key}": birthDate must be a string if provided`);
  }
  if (deathYear !== undefined && typeof deathYear !== 'string') {
    throw new Error(`Invalid person "${key}": deathYear must be a string if provided`);
  }
  if (deathDate !== undefined && typeof deathDate !== 'string') {
    throw new Error(`Invalid person "${key}": deathDate must be a string if provided`);
  }
  if (birthCalendarType !== undefined && (typeof birthCalendarType !== 'string' || !VALID_CALENDAR_TYPES.has(birthCalendarType))) {
    throw new Error(`Invalid person "${key}": birthCalendarType must be solar|lunar if provided`);
  }
  if (deathCalendarType !== undefined && (typeof deathCalendarType !== 'string' || !VALID_CALENDAR_TYPES.has(deathCalendarType))) {
    throw new Error(`Invalid person "${key}": deathCalendarType must be solar|lunar if provided`);
  }
  if (title !== undefined && typeof title !== 'string') {
    throw new Error(`Invalid person "${key}": title must be a string if provided`);
  }
  if (bio !== undefined && typeof bio !== 'string') {
    throw new Error(`Invalid person "${key}": bio must be a string if provided`);
  }
  if (avatarImageId !== undefined && typeof avatarImageId !== 'string') {
    throw new Error(`Invalid person "${key}": avatarImageId must be a string if provided`);
  }
  if (galleryImageIds !== undefined) {
    if (!Array.isArray(galleryImageIds) || !galleryImageIds.every((g): g is string => typeof g === 'string')) {
      throw new Error(`Invalid person "${key}": galleryImageIds must be a string array if provided`);
    }
  }
  if (familyIntro !== undefined && typeof familyIntro !== 'string') {
    throw new Error(`Invalid person "${key}": familyIntro must be a string if provided`);
  }

  if (!Array.isArray(spouseIds)) {
    throw new Error(`Invalid person "${key}": spouseIds must be an array`);
  }
  if (!Array.isArray(childrenIds)) {
    throw new Error(`Invalid person "${key}": childrenIds must be an array`);
  }
  if (!Array.isArray(parentIds)) {
    throw new Error(`Invalid person "${key}": parentIds must be an array`);
  }

  if (!spouseIds.every((s): s is string => typeof s === 'string')) {
    throw new Error(`Invalid person "${key}": spouseIds must contain only strings`);
  }
  if (!childrenIds.every((c): c is string => typeof c === 'string')) {
    throw new Error(`Invalid person "${key}": childrenIds must contain only strings`);
  }
  if (!parentIds.every((p): p is string => typeof p === 'string')) {
    throw new Error(`Invalid person "${key}": parentIds must contain only strings`);
  }

  return {
    id,
    name,
    gender: gender as Gender,
    generation,
    spouseIds,
    childrenIds,
    parentIds,
    collapsed: typeof collapsed === 'boolean' ? collapsed : false,
    ...(birthYear !== undefined ? { birthYear } : {}),
    ...(birthDate !== undefined ? { birthDate } : {}),
    ...(deathYear !== undefined ? { deathYear } : {}),
    ...(deathDate !== undefined ? { deathDate } : {}),
    ...(birthCalendarType !== undefined ? { birthCalendarType: birthCalendarType as CalendarType } : {}),
    ...(deathCalendarType !== undefined ? { deathCalendarType: deathCalendarType as CalendarType } : {}),
    ...(title !== undefined ? { title } : {}),
    ...(parentCollapsed !== undefined && typeof parentCollapsed === 'boolean' ? { parentCollapsed } : {}),
    ...(bio !== undefined ? { bio } : {}),
    ...(avatarImageId !== undefined ? { avatarImageId } : {}),
    ...(galleryImageIds !== undefined ? { galleryImageIds } : {}),
    ...(familyIntro !== undefined ? { familyIntro } : {}),
  };
}

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
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) return { ...EMPTY_DATA };

    const persons: Record<string, Person> = {};
    if (isPlainObject(parsed.persons)) {
      for (const [key, personRaw] of Object.entries(parsed.persons)) {
        if (!isSafeKey(key)) continue;
        try {
          persons[key] = validatePerson(personRaw, key);
        } catch {
          // Skip invalid person entries — don't crash app startup
        }
      }
    }

    let siblingOrder: Record<string, string[]> = {};
    let spouseOrder: Record<string, string[]> = {};
    let treeNames: Record<string, string> = {};
    try {
      if (parsed.siblingOrder) siblingOrder = validateStringArrayRecord(parsed.siblingOrder, 'siblingOrder');
      if (parsed.spouseOrder) spouseOrder = validateStringArrayRecord(parsed.spouseOrder, 'spouseOrder');
      if (parsed.treeNames) treeNames = validateStringRecord(parsed.treeNames, 'treeNames');
    } catch {
      // Fall back to empty for corrupted auxiliary fields
    }

    return {
      persons,
      siblingOrder,
      spouseOrder,
      selectedPersonId: typeof parsed.selectedPersonId === 'string' ? parsed.selectedPersonId : null,
      currentTree: typeof parsed.currentTree === 'string' ? parsed.currentTree : null,
      treeNames,
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

function validateStringRecord(val: unknown, field: string): Record<string, string> {
  if (!isPlainObject(val)) throw new Error(`Invalid data format: ${field} must be an object`);
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(val)) {
    if (!isSafeKey(k)) continue;
    if (typeof v !== 'string') throw new Error(`Invalid data format: ${field}["${k}"] must be a string`);
    result[k] = v;
  }
  return result;
}

function validateStringArrayRecord(val: unknown, field: string): Record<string, string[]> {
  if (!isPlainObject(val)) throw new Error(`Invalid data format: ${field} must be an object`);
  const result: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(val)) {
    if (!isSafeKey(k)) continue;
    if (!Array.isArray(v) || !v.every((item): item is string => typeof item === 'string')) {
      throw new Error(`Invalid data format: ${field}["${k}"] must be a string array`);
    }
    result[k] = v;
  }
  return result;
}

export function importData(json: string): LocalData {
  const parsed: unknown = JSON.parse(json);

  if (!isPlainObject(parsed)) {
    throw new Error('Invalid data format: expected a JSON object');
  }

  if (!isPlainObject(parsed.persons)) {
    throw new Error('Invalid data format: missing or invalid persons');
  }

  const persons: Record<string, Person> = {};
  for (const [key, raw] of Object.entries(parsed.persons)) {
    if (!isSafeKey(key)) continue;
    persons[key] = validatePerson(raw, key);
  }

  return {
    persons,
    siblingOrder: parsed.siblingOrder ? validateStringArrayRecord(parsed.siblingOrder, 'siblingOrder') : {},
    spouseOrder: parsed.spouseOrder ? validateStringArrayRecord(parsed.spouseOrder, 'spouseOrder') : {},
    selectedPersonId: typeof parsed.selectedPersonId === 'string' ? parsed.selectedPersonId : null,
    currentTree: typeof parsed.currentTree === 'string' ? parsed.currentTree : null,
    treeNames: parsed.treeNames ? validateStringRecord(parsed.treeNames, 'treeNames') : {},
  };
}

export function extractImageMeta(parsed: unknown): Record<string, ImageMeta> | undefined {
  if (!isPlainObject(parsed)) return undefined;
  const raw = (parsed as Record<string, unknown>).images;
  if (raw === undefined) return undefined;
  if (!isPlainObject(raw)) throw new Error('Invalid data format: images must be an object');
  const result: Record<string, ImageMeta> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!isSafeKey(k)) continue;
    if (!isPlainObject(v)) throw new Error(`Invalid data format: images["${k}"] must be an object`);
    const { id, personId, format, kind } = v as Record<string, unknown>;
    if (typeof id !== 'string' || typeof personId !== 'string' || typeof format !== 'string') {
      throw new Error(`Invalid data format: images["${k}"] has invalid metadata`);
    }
    if (kind !== 'avatar' && kind !== 'gallery') {
      throw new Error(`Invalid data format: images["${k}"] kind must be avatar|gallery`);
    }
    result[k] = { id, personId, format, kind };
  }
  return result;
}
