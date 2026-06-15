import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest';
import {
  loadLocalData,
  saveLocalData,
  saveLocalDataImmediate,
  clearLocalData,
  exportData,
  importData,
  extractImageMeta,
  type LocalData,
} from './localDb';

const STORAGE_KEY = 'genealogy_data';

function createValidPerson(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'p1',
    name: 'Test',
    gender: 'male',
    generation: 0,
    spouseIds: [],
    childrenIds: [],
    parentIds: [],
    collapsed: false,
    ...overrides,
  };
}

function createValidLocalData(): LocalData {
  return {
    persons: {
      p1: createValidPerson() as unknown as Person,
    },
    siblingOrder: {},
    spouseOrder: {},
    selectedPersonId: 'p1',
    currentTree: 'tree1',
    treeNames: { tree1: 'My Tree' },
  };
}

describe('loadLocalData', () => {
  let getItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('returns empty data when no localStorage entry exists', () => {
    getItemSpy.mockReturnValue(null);
    const result = loadLocalData();
    expect(result).toEqual({
      persons: {},
      siblingOrder: {},
      spouseOrder: {},
      selectedPersonId: null,
      currentTree: null,
      treeNames: {},
    });
    expect(getItemSpy).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('parses valid stored data', () => {
    const stored = createValidLocalData();
    getItemSpy.mockReturnValue(JSON.stringify(stored));
    const result = loadLocalData();
    expect(result.persons).toEqual(stored.persons);
    expect(result.siblingOrder).toEqual(stored.siblingOrder);
    expect(result.spouseOrder).toEqual(stored.spouseOrder);
    expect(result.selectedPersonId).toBe('p1');
    expect(result.currentTree).toBe('tree1');
    expect(result.treeNames).toEqual({ tree1: 'My Tree' });
  });

  it('handles corrupted JSON gracefully', () => {
    getItemSpy.mockReturnValue('not valid json {{{');
    const result = loadLocalData();
    expect(result).toEqual({
      persons: {},
      siblingOrder: {},
      spouseOrder: {},
      selectedPersonId: null,
      currentTree: null,
      treeNames: {},
    });
  });
});

describe('saveLocalDataImmediate / clearLocalData', () => {
  let getItemSpy: ReturnType<typeof vi.spyOn>;
  let setItemSpy: ReturnType<typeof vi.spyOn>;
  let removeItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('performs a basic round-trip', () => {
    const data = createValidLocalData();
    saveLocalDataImmediate(data);
    expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(data));

    getItemSpy.mockReturnValue(JSON.stringify(data));
    const loaded = loadLocalData();
    expect(loaded).toEqual(data);
  });

  it('clearLocalData removes the storage key', () => {
    clearLocalData();
    expect(removeItemSpy).toHaveBeenCalledWith(STORAGE_KEY);
  });
});

describe('exportData', () => {
  it('produces formatted JSON with indent 2', () => {
    const data = createValidLocalData();
    const json = exportData(data);
    expect(json).toBe(JSON.stringify(data, null, 2));
    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });
});

describe('importData', () => {
  it('imports valid complete data', () => {
    const data = createValidLocalData();
    const json = JSON.stringify(data);
    const result = importData(json);
    expect(result.persons.p1).toMatchObject({
      id: 'p1',
      name: 'Test',
      gender: 'male',
      generation: 0,
      spouseIds: [],
      childrenIds: [],
      parentIds: [],
      collapsed: false,
    });
    expect(result.siblingOrder).toEqual({});
    expect(result.spouseOrder).toEqual({});
    expect(result.selectedPersonId).toBe('p1');
    expect(result.currentTree).toBe('tree1');
    expect(result.treeNames).toEqual({ tree1: 'My Tree' });
  });

  it('throws when persons field is missing', () => {
    const data = { ...createValidLocalData(), persons: undefined };
    expect(() => importData(JSON.stringify(data))).toThrow('Invalid data format: missing or invalid persons');
  });

  it('throws when persons is not an object', () => {
    const data = { ...createValidLocalData(), persons: 'bad' };
    expect(() => importData(JSON.stringify(data))).toThrow('Invalid data format: missing or invalid persons');
  });

  it('throws on invalid person gender', () => {
    const data = {
      ...createValidLocalData(),
      persons: { p1: createValidPerson({ gender: 'invalid' }) },
    };
    expect(() => importData(JSON.stringify(data))).toThrow('gender must be male|female|unknown');
  });

  it('throws on missing person id', () => {
    const data = {
      ...createValidLocalData(),
      persons: { p1: createValidPerson({ id: '' }) },
    };
    expect(() => importData(JSON.stringify(data))).toThrow('id must be a non-empty string');
  });

  it('throws on invalid generation', () => {
    const data = {
      ...createValidLocalData(),
      persons: { p1: createValidPerson({ generation: Infinity }) },
    };
    expect(() => importData(JSON.stringify(data))).toThrow('generation must be a finite number');
  });

  it('throws on non-number generation', () => {
    const data = {
      ...createValidLocalData(),
      persons: { p1: createValidPerson({ generation: '1' }) },
    };
    expect(() => importData(JSON.stringify(data))).toThrow('generation must be a finite number');
  });

  it('works with optional fields', () => {
    const person = createValidPerson({
      birthYear: 1900,
      deathYear: '2000',
      title: 'Dr.',
      bio: 'A bio',
      parentCollapsed: true,
    });
    const data = {
      ...createValidLocalData(),
      persons: { p1: person },
    };
    const result = importData(JSON.stringify(data));
    expect(result.persons.p1.birthYear).toBe(1900);
    expect(result.persons.p1.deathYear).toBe('2000');
    expect(result.persons.p1.title).toBe('Dr.');
    expect(result.persons.p1.bio).toBe('A bio');
    expect(result.persons.p1.parentCollapsed).toBe(true);
  });

  it('throws on invalid birthYear', () => {
    const data = {
      ...createValidLocalData(),
      persons: { p1: createValidPerson({ birthYear: '1900' }) },
    };
    expect(() => importData(JSON.stringify(data))).toThrow('birthYear must be a finite number if provided');
  });

  it('throws on invalid deathYear', () => {
    const data = {
      ...createValidLocalData(),
      persons: { p1: createValidPerson({ deathYear: 2000 }) },
    };
    expect(() => importData(JSON.stringify(data))).toThrow('deathYear must be a string if provided');
  });

  it('throws on invalid title', () => {
    const data = {
      ...createValidLocalData(),
      persons: { p1: createValidPerson({ title: 123 }) },
    };
    expect(() => importData(JSON.stringify(data))).toThrow('title must be a string if provided');
  });

  it('throws on invalid bio', () => {
    const data = {
      ...createValidLocalData(),
      persons: { p1: createValidPerson({ bio: 123 }) },
    };
    expect(() => importData(JSON.stringify(data))).toThrow('bio must be a string if provided');
  });

  it('throws on invalid siblingOrder', () => {
    const data = {
      ...createValidLocalData(),
      siblingOrder: { p1: [1, 2] },
    };
    expect(() => importData(JSON.stringify(data))).toThrow('siblingOrder["p1"] must be a string array');
  });

  it('throws on non-object siblingOrder', () => {
    const data = {
      ...createValidLocalData(),
      siblingOrder: 'bad',
    };
    expect(() => importData(JSON.stringify(data))).toThrow('siblingOrder must be an object');
  });

  it('throws on invalid spouseOrder', () => {
    const data = {
      ...createValidLocalData(),
      spouseOrder: { p1: 'bad' },
    };
    expect(() => importData(JSON.stringify(data))).toThrow('spouseOrder["p1"] must be a string array');
  });

  it('throws on non-object spouseOrder', () => {
    const data = {
      ...createValidLocalData(),
      spouseOrder: 123,
    };
    expect(() => importData(JSON.stringify(data))).toThrow('spouseOrder must be an object');
  });

  it('throws on invalid treeNames', () => {
    const data = {
      ...createValidLocalData(),
      treeNames: { tree1: 123 },
    };
    expect(() => importData(JSON.stringify(data))).toThrow('treeNames["tree1"] must be a string');
  });

  it('throws on non-object treeNames', () => {
    const data = {
      ...createValidLocalData(),
      treeNames: 'bad',
    };
    expect(() => importData(JSON.stringify(data))).toThrow('treeNames must be an object');
  });
});

describe('saveLocalData', () => {
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('debounces saves', () => {
    const data = createValidLocalData();
    saveLocalData(data);
    expect(setItemSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(data));
  });

  it('resets timer on subsequent calls', () => {
    const data1 = createValidLocalData();
    const data2 = { ...createValidLocalData(), selectedPersonId: 'p2' };

    saveLocalData(data1);
    vi.advanceTimersByTime(100);
    expect(setItemSpy).not.toHaveBeenCalled();

    saveLocalData(data2);
    vi.advanceTimersByTime(200);
    expect(setItemSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(data2));
  });
});

describe('avatarImageId / galleryImageIds validation', () => {
  it('accepts valid avatarImageId', () => {
    const person = createValidPerson({ avatarImageId: 'img1' });
    const data = { ...createValidLocalData(), persons: { p1: person } };
    const result = importData(JSON.stringify(data));
    expect(result.persons.p1.avatarImageId).toBe('img1');
  });

  it('accepts valid galleryImageIds', () => {
    const person = createValidPerson({ galleryImageIds: ['img1', 'img2'] });
    const data = { ...createValidLocalData(), persons: { p1: person } };
    const result = importData(JSON.stringify(data));
    expect(result.persons.p1.galleryImageIds).toEqual(['img1', 'img2']);
  });

  it('throws on non-string avatarImageId', () => {
    const person = createValidPerson({ avatarImageId: 123 });
    const data = { ...createValidLocalData(), persons: { p1: person } };
    expect(() => importData(JSON.stringify(data))).toThrow('avatarImageId must be a string');
  });

  it('throws on non-array galleryImageIds', () => {
    const person = createValidPerson({ galleryImageIds: 'bad' });
    const data = { ...createValidLocalData(), persons: { p1: person } };
    expect(() => importData(JSON.stringify(data))).toThrow('galleryImageIds must be a string array');
  });

  it('throws on galleryImageIds with non-string elements', () => {
    const person = createValidPerson({ galleryImageIds: ['ok', 5] });
    const data = { ...createValidLocalData(), persons: { p1: person } };
    expect(() => importData(JSON.stringify(data))).toThrow('galleryImageIds must be a string array');
  });

  it('works without avatarImageId/galleryImageIds (backward compat)', () => {
    const data = createValidLocalData();
    const result = importData(JSON.stringify(data));
    expect(result.persons.p1.avatarImageId).toBeUndefined();
    expect(result.persons.p1.galleryImageIds).toBeUndefined();
  });
});

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
    expect(() => importData(JSON.stringify(data))).toThrow(
      'Invalid person "test-1": familyIntro must be a string if provided',
    );
  });
});

describe('extractImageMeta', () => {
  it('returns undefined when no images field', () => {
    expect(extractImageMeta({ persons: {} })).toBeUndefined();
  });

  it('parses valid images map', () => {
    const parsed = {
      images: {
        img1: { id: 'img1', personId: 'p1', format: 'jpeg', kind: 'gallery' },
      },
    };
    const result = extractImageMeta(parsed);
    expect(result).toEqual({
      img1: { id: 'img1', personId: 'p1', format: 'jpeg', kind: 'gallery' },
    });
  });

  it('throws on invalid kind', () => {
    const parsed = {
      images: {
        img1: { id: 'img1', personId: 'p1', format: 'jpeg', kind: 'bad' },
      },
    };
    expect(() => extractImageMeta(parsed)).toThrow('kind must be avatar|gallery');
  });
});
