import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Person } from '../types';
import {
  computeLayout,
  computeUnitPersonOrder,
  getCardSize,
  getLayoutConstants,
  type LayoutResult,
} from './engine';

// Mock the i18n module
vi.mock('../i18n', () => ({
  isEnglish: vi.fn(() => false),
}));

import { isEnglish } from '../i18n';

/**
 * Helper function to create a Person object for tests
 */
function createPerson(
  id: string,
  overrides: Partial<Person> = {},
): Person {
  return {
    id,
    name: `Person ${id}`,
    gender: 'unknown',
    generation: 0,
    spouseIds: [],
    childrenIds: [],
    parentIds: [],
    collapsed: false,
    ...overrides,
  };
}

describe('computeLayout', () => {
  beforeEach(() => {
    vi.mocked(isEnglish).mockReturnValue(false);
  });

  it('returns empty result for empty persons', () => {
    const result = computeLayout({});

    expect(result.units.size).toBe(0);
    expect(result.positions.size).toBe(0);
    expect(result.personToUnit.size).toBe(0);
    expect(result.rootUnitIds).toEqual([]);
    expect(result.effectiveRootIds).toEqual([]);
    expect(result.crossTreeLinks).toEqual([]);
    expect(result.crossTreeParentUnits.size).toBe(0);
    expect(result.minGen).toBe(0);
    expect(result.maxGen).toBe(0);
  });

  it('handles a single person', () => {
    const persons: Record<string, Person> = {
      p1: createPerson('p1', { gender: 'male', generation: 0 }),
    };

    const result = computeLayout(persons);

    expect(result.units.size).toBe(1);
    expect(result.rootUnitIds).toContain('p1');
    expect(result.effectiveRootIds).toContain('p1');
    expect(result.personToUnit.get('p1')).toBe('p1');
    expect(result.positions.has('p1')).toBe(true);
    expect(result.minGen).toBe(0);
    expect(result.maxGen).toBe(0);
  });

  it('handles parent with children', () => {
    const persons: Record<string, Person> = {
      parent: createPerson('parent', {
        gender: 'male',
        generation: 0,
        childrenIds: ['child1', 'child2'],
      }),
      child1: createPerson('child1', {
        gender: 'male',
        generation: 1,
        parentIds: ['parent'],
      }),
      child2: createPerson('child2', {
        gender: 'female',
        generation: 1,
        parentIds: ['parent'],
      }),
    };

    const result = computeLayout(persons);

    expect(result.units.size).toBe(3);
    expect(result.rootUnitIds).toContain('parent');

    const parentUnit = result.units.get('parent');
    expect(parentUnit?.childrenUnitIds).toContain('child1');
    expect(parentUnit?.childrenUnitIds).toContain('child2');

    expect(result.personToUnit.get('child1')).toBe('child1');
    expect(result.personToUnit.get('child2')).toBe('child2');
    expect(result.minGen).toBe(0);
    expect(result.maxGen).toBe(1);
  });

  it('renders couple (spouse) in same unit', () => {
    const persons: Record<string, Person> = {
      husband: createPerson('husband', {
        gender: 'male',
        generation: 0,
        spouseIds: ['wife'],
      }),
      wife: createPerson('wife', {
        gender: 'female',
        generation: 0,
        spouseIds: ['husband'],
      }),
    };

    const result = computeLayout(persons);

    // Both should be in the same unit
    const husbandUnitId = result.personToUnit.get('husband');
    const wifeUnitId = result.personToUnit.get('wife');
    expect(husbandUnitId).toBe(wifeUnitId);

    const unit = result.units.get(husbandUnitId!);
    expect(unit?.spouseIds).toContain('wife');
    expect(unit?.personId).toBe('husband');
  });

  it('hides children when unit is collapsed', () => {
    const persons: Record<string, Person> = {
      parent: createPerson('parent', {
        gender: 'male',
        generation: 0,
        childrenIds: ['child1'],
        collapsed: true,
      }),
      child1: createPerson('child1', {
        gender: 'male',
        generation: 1,
        parentIds: ['parent'],
      }),
    };

    const result = computeLayout(persons);

    const parentUnit = result.units.get('parent');
    expect(parentUnit?.collapsed).toBe(true);
    expect(parentUnit?.childrenUnitIds).toContain('child1');

    // Child unit should exist but not be laid out (no position)
    expect(result.units.has('child1')).toBe(true);
    expect(result.positions.has('child1')).toBe(false);
  });

  it('orders siblings by birthYear', () => {
    const persons: Record<string, Person> = {
      parent: createPerson('parent', {
        gender: 'male',
        generation: 0,
        childrenIds: ['child2', 'child1', 'child3'],
      }),
      child1: createPerson('child1', {
        gender: 'male',
        generation: 1,
        parentIds: ['parent'],
        birthYear: 1990,
      }),
      child2: createPerson('child2', {
        gender: 'male',
        generation: 1,
        parentIds: ['parent'],
        birthYear: 1985,
      }),
      child3: createPerson('child3', {
        gender: 'male',
        generation: 1,
        parentIds: ['parent'],
        birthYear: 1995,
      }),
    };

    const result = computeLayout(persons);

    const parentUnit = result.units.get('parent');
    // Should be ordered by birthYear: child2 (1985), child1 (1990), child3 (1995)
    expect(parentUnit?.childrenUnitIds).toEqual(['child2', 'child1', 'child3']);
  });

  it('respects manual sibling ordering', () => {
    const persons: Record<string, Person> = {
      parent: createPerson('parent', {
        gender: 'male',
        generation: 0,
        childrenIds: ['child2', 'child1', 'child3'],
      }),
      child1: createPerson('child1', {
        gender: 'male',
        generation: 1,
        parentIds: ['parent'],
        birthYear: 1990,
      }),
      child2: createPerson('child2', {
        gender: 'male',
        generation: 1,
        parentIds: ['parent'],
        birthYear: 1985,
      }),
      child3: createPerson('child3', {
        gender: 'male',
        generation: 1,
        parentIds: ['parent'],
        birthYear: 1995,
      }),
    };

    const siblingOrder: Record<string, string[]> = {
      parent: ['child3', 'child1', 'child2'],
    };

    const result = computeLayout(persons, siblingOrder);

    const parentUnit = result.units.get('parent');
    // Manual order should override birthYear: child3, child1, child2
    expect(parentUnit?.childrenUnitIds).toEqual(['child3', 'child1', 'child2']);
  });

  it('normalizes negative generation offsets', () => {
    const persons: Record<string, Person> = {
      root: createPerson('root', {
        gender: 'male',
        generation: -2,
      }),
      child: createPerson('child', {
        gender: 'male',
        generation: -1,
        parentIds: ['root'],
      }),
      grandchild: createPerson('grandchild', {
        gender: 'male',
        generation: 0,
        parentIds: ['child'],
      }),
    };

    const result = computeLayout(persons);

    // After normalization, minGen should be >= 0
    expect(result.minGen).toBeGreaterThanOrEqual(0);
    expect(result.maxGen).toBe(2);

    // Verify relative generations are preserved
    const rootUnit = result.units.get('root');
    const childUnit = result.units.get('child');
    const grandchildUnit = result.units.get('grandchild');

    expect(rootUnit?.generation).toBe(0);
    expect(childUnit?.generation).toBe(1);
    expect(grandchildUnit?.generation).toBe(2);
  });
});

describe('computeUnitPersonOrder', () => {
  it('places males on left, females on right', () => {
    const persons: Record<string, Person> = {
      p1: createPerson('p1', { gender: 'male' }),
      p2: createPerson('p2', { gender: 'female' }),
      p3: createPerson('p3', { gender: 'male' }),
      p4: createPerson('p4', { gender: 'female' }),
    };

    const result = computeUnitPersonOrder('p1', ['p2', 'p3', 'p4'], persons);

    // Males should come first, then females
    expect(result).toEqual(['p1', 'p3', 'p2', 'p4']);
  });

  it('places primary person first within their gender group', () => {
    const persons: Record<string, Person> = {
      primary: createPerson('primary', { gender: 'male' }),
      other1: createPerson('other1', { gender: 'male' }),
      other2: createPerson('other2', { gender: 'male' }),
    };

    const result = computeUnitPersonOrder('primary', ['other1', 'other2'], persons);

    // Primary should be first among males
    expect(result[0]).toBe('primary');
    expect(result.slice(1)).toContain('other1');
    expect(result.slice(1)).toContain('other2');
  });

  it('places primary female first among females (at end)', () => {
    const persons: Record<string, Person> = {
      primary: createPerson('primary', { gender: 'female' }),
      other1: createPerson('other1', { gender: 'female' }),
      male1: createPerson('male1', { gender: 'male' }),
    };

    const result = computeUnitPersonOrder('primary', ['other1', 'male1'], persons);

    // Males first, then females; primary is sorted to end of females
    expect(result).toEqual(['male1', 'other1', 'primary']);
  });

  it('respects manual spouseOrder', () => {
    const persons: Record<string, Person> = {
      primary: createPerson('primary', { gender: 'male' }),
      spouseA: createPerson('spouseA', { gender: 'male' }),
      spouseB: createPerson('spouseB', { gender: 'male' }),
      spouseC: createPerson('spouseC', { gender: 'male' }),
    };

    const spouseOrder: Record<string, string[]> = {
      primary: ['spouseC', 'spouseA', 'spouseB'],
    };

    const result = computeUnitPersonOrder('primary', ['spouseA', 'spouseB', 'spouseC'], persons, spouseOrder);

    // Primary first, then manual order
    expect(result).toEqual(['primary', 'spouseC', 'spouseA', 'spouseB']);
  });
});

describe('getCardSize', () => {
  it('returns Chinese card size when isEnglish returns false', () => {
    vi.mocked(isEnglish).mockReturnValue(false);

    const size = getCardSize();

    expect(size.width).toBe(64);
    expect(size.height).toBe(100);
  });

  it('returns English card size when isEnglish returns true', () => {
    vi.mocked(isEnglish).mockReturnValue(true);

    const size = getCardSize();

    expect(size.width).toBe(100);
    expect(size.height).toBe(72);
  });
});

describe('getLayoutConstants', () => {
  it('returns correct constants for Chinese locale', () => {
    vi.mocked(isEnglish).mockReturnValue(false);

    const constants = getLayoutConstants();

    expect(constants.CARD_WIDTH).toBe(64);
    expect(constants.CARD_HEIGHT).toBe(100);
    expect(constants.H_GAP).toBe(30);
    expect(constants.V_GAP).toBe(50);
    expect(constants.COUPLE_GAP).toBe(10);
  });

  it('returns correct constants for English locale', () => {
    vi.mocked(isEnglish).mockReturnValue(true);

    const constants = getLayoutConstants();

    expect(constants.CARD_WIDTH).toBe(100);
    expect(constants.CARD_HEIGHT).toBe(72);
    expect(constants.H_GAP).toBe(30);
    expect(constants.V_GAP).toBe(50);
    expect(constants.COUPLE_GAP).toBe(10);
  });
});