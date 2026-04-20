import { describe, it, expect, vi } from 'vitest';
import type { Person } from '../types';
import {
  getEdgeDirection,
  computePathEdges,
  buildChain,
  composeRelationshipLabel,
  computeVisibleChain,
} from './relationshipChain';

vi.mock('../i18n', () => ({
  t: vi.fn((key: string) => key),
  isEnglish: vi.fn(() => false),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makePerson(overrides: Partial<Person> & Pick<Person, 'id' | 'name' | 'gender'>): Person {
  return {
    birthYear: undefined,
    deathYear: undefined,
    title: undefined,
    generation: 0,
    spouseIds: [],
    childrenIds: [],
    parentIds: [],
    collapsed: false,
    parentCollapsed: undefined,
    bio: undefined,
    ...overrides,
  };
}

// ─── Test Data: a realistic family tree ─────────────────────────────────────
//
//   g1: grandpa (male, 1940) ─┬─ grandma (female, 1942)
//                              │
//   g2: father   (male, 1965) ─┬─ mother   (female, 1968)
//        │                     │
//   g3: alice    (female,1990)─┬─ bob      (male,1992)
//                              │
//   g4: charlie  (male, 2015)
//
// Also: uncle (male, 1967) is another child of grandpa+grandma
//       cousin  (male, 1995) is child of uncle

const grandpa = makePerson({ id: 'grandpa', name: '爷爷', gender: 'male', birthYear: 1940, generation: 1, childrenIds: ['father', 'uncle'], spouseIds: ['grandma'] });
const grandma = makePerson({ id: 'grandma', name: '奶奶', gender: 'female', birthYear: 1942, generation: 1, childrenIds: ['father', 'uncle'], spouseIds: ['grandpa'] });
const father = makePerson({ id: 'father', name: '父亲', gender: 'male', birthYear: 1965, generation: 2, parentIds: ['grandpa', 'grandma'], childrenIds: ['alice'], spouseIds: ['mother'] });
const mother = makePerson({ id: 'mother', name: '母亲', gender: 'female', birthYear: 1968, generation: 2, childrenIds: ['alice'], spouseIds: ['father'] });
const uncle = makePerson({ id: 'uncle', name: '叔叔', gender: 'male', birthYear: 1967, generation: 2, parentIds: ['grandpa', 'grandma'], childrenIds: ['cousin'], spouseIds: ['aunt'] });
const aunt = makePerson({ id: 'aunt', name: '婶婶', gender: 'female', birthYear: 1970, generation: 2, childrenIds: ['cousin'], spouseIds: ['uncle'] });
const alice = makePerson({ id: 'alice', name: 'Alice', gender: 'female', birthYear: 1990, generation: 3, parentIds: ['father', 'mother'], childrenIds: ['charlie'], spouseIds: ['bob'] });
const bob = makePerson({ id: 'bob', name: 'Bob', gender: 'male', birthYear: 1992, generation: 3, childrenIds: ['charlie'], spouseIds: ['alice'] });
const cousin = makePerson({ id: 'cousin', name: '堂兄', gender: 'male', birthYear: 1995, generation: 3, parentIds: ['uncle', 'aunt'] });
const charlie = makePerson({ id: 'charlie', name: 'Charlie', gender: 'male', birthYear: 2015, generation: 4, parentIds: ['alice', 'bob'] });

const persons: Record<string, Person> = {
  grandpa, grandma, father, mother, uncle, aunt, alice, bob, cousin, charlie,
};

// ─── getEdgeDirection ───────────────────────────────────────────────────────

describe('getEdgeDirection', () => {
  it('returns parent when from is parent of to', () => {
    expect(getEdgeDirection(persons, 'father', 'alice')).toBe('parent');
    expect(getEdgeDirection(persons, 'grandpa', 'father')).toBe('parent');
  });

  it('returns child when from is child of to', () => {
    expect(getEdgeDirection(persons, 'alice', 'father')).toBe('child');
    expect(getEdgeDirection(persons, 'father', 'grandpa')).toBe('child');
  });

  it('returns spouse when from and to are spouses', () => {
    expect(getEdgeDirection(persons, 'father', 'mother')).toBe('spouse');
    expect(getEdgeDirection(persons, 'mother', 'father')).toBe('spouse');
    expect(getEdgeDirection(persons, 'alice', 'bob')).toBe('spouse');
  });

  it('defaults to spouse for unknown / unrelated person', () => {
    expect(getEdgeDirection(persons, 'nobody', 'alice')).toBe('spouse');
    // two existing people with no direct link also fall through to spouse
    expect(getEdgeDirection(persons, 'alice', 'cousin')).toBe('spouse');
  });
});

// ─── computePathEdges ───────────────────────────────────────────────────────

describe('computePathEdges', () => {
  it('computes correct directions for a multi-hop path', () => {
    // charlie → alice → father → grandpa
    const path = ['charlie', 'alice', 'father', 'grandpa'];
    const edges = computePathEdges(persons, path);
    expect(edges).toEqual([
      { fromId: 'charlie', toId: 'alice', direction: 'child' },
      { fromId: 'alice', toId: 'father', direction: 'child' },
      { fromId: 'father', toId: 'grandpa', direction: 'child' },
    ]);
  });

  it('handles a path with a spouse edge in the middle', () => {
    // grandpa → grandma → uncle
    const path = ['grandpa', 'grandma', 'uncle'];
    const edges = computePathEdges(persons, path);
    expect(edges).toEqual([
      { fromId: 'grandpa', toId: 'grandma', direction: 'spouse' },
      { fromId: 'grandma', toId: 'uncle', direction: 'parent' },
    ]);
  });
});

// ─── buildChain ─────────────────────────────────────────────────────────────

describe('buildChain', () => {
  it('returns empty nodes and edges for empty path', () => {
    const chain = buildChain(persons, []);
    expect(chain.nodes).toEqual([]);
    expect(chain.edges).toEqual([]);
  });

  it('returns a single node for a single-person path', () => {
    const chain = buildChain(persons, ['alice']);
    expect(chain.nodes).toHaveLength(1);
    expect(chain.nodes[0]).toMatchObject({
      personIds: ['alice'],
      label: 'Alice',
      collapsed: false,
      collapsible: false,
    });
    expect(chain.edges).toEqual([]);
  });

  it('builds a multi-person path with correct edge labels', () => {
    // charlie → alice → father
    const chain = buildChain(persons, ['charlie', 'alice', 'father']);
    expect(chain.nodes).toHaveLength(3);
    expect(chain.nodes[0].label).toBe('Charlie');
    expect(chain.nodes[1].label).toBe('Alice');
    expect(chain.nodes[2].label).toBe('父亲');

    expect(chain.edges).toHaveLength(2);
    // charlie (male child) → alice: 儿子
    expect(chain.edges[0].label).toBe('relSon');
    // alice (female child) → father: 女儿
    expect(chain.edges[1].label).toBe('relDaughter');
  });

  it('detects branch nodes for shared parents', () => {
    // uncle → grandpa → father
    // grandpa is parent of both uncle and father, grandma is the other parent
    const chain = buildChain(persons, ['uncle', 'grandpa', 'father']);
    const branchNode = chain.nodes[1];
    expect(branchNode.branch).toBeDefined();
    expect(branchNode.branch!.personId).toBe('grandma');
    expect(branchNode.branch!.label).toBe('奶奶');
    // uncle → grandma direction is child (uncle is child of grandma)
    expect(branchNode.branch!.edgeBefore).toBe('relSon');
    // grandma → father direction is parent (grandma is parent of father)
    expect(branchNode.branch!.edgeAfter).toBe('relMother');
  });
});

// ─── composeRelationshipLabel ───────────────────────────────────────────────

describe('composeRelationshipLabel', () => {
  function labelFor(path: string[], fromIdx: number, toIdx: number): string {
    const chain = buildChain(persons, path);
    return composeRelationshipLabel(persons, chain, fromIdx, toIdx);
  }

  it('direct parent (D) → father / mother', () => {
    // father → alice (D): father is parent of alice
    expect(labelFor(['father', 'alice'], 0, 1)).toBe('relFather');
    // mother → alice (D): mother is parent of alice
    expect(labelFor(['mother', 'alice'], 0, 1)).toBe('relMother');
  });

  it('direct child (U) → son / daughter', () => {
    // alice → father (U): alice is child of father, alice is female
    expect(labelFor(['alice', 'father'], 0, 1)).toBe('relDaughter');
    // father → alice (D): father is parent of alice, father is male
    expect(labelFor(['father', 'alice'], 0, 1)).toBe('relFather');
  });

  it('spouse (S) → husband / wife', () => {
    // father → mother (S)
    expect(labelFor(['father', 'mother'], 0, 1)).toBe('relHusband');
    // mother → father (S)
    expect(labelFor(['mother', 'father'], 0, 1)).toBe('relWife');
  });

  it('siblings (UD) → brother / sister labels', () => {
    // father → uncle: same parents (grandpa, grandma)
    // father (male, 1965) → uncle (male, 1967): older brother
    expect(labelFor(['father', 'grandpa', 'uncle'], 0, 2)).toBe('relOlderBrother');
    // uncle → father: younger brother
    expect(labelFor(['uncle', 'grandpa', 'father'], 0, 2)).toBe('relYoungerBrother');
  });

  it('uncle/aunt (UUD) → nephew / niece', () => {
    // alice → uncle: alice child→father parent→grandpa parent→uncle child
    // pattern UUD
    // alice (female) is niece of uncle (male)
    expect(labelFor(['alice', 'father', 'grandpa', 'uncle'], 0, 3)).toBe('relNiece');
    // charlie → uncle: charlie child→alice child→father parent→grandpa parent→uncle child (UUUD, not UUD)
  });

  it('nephew/niece (UDD) → uncle / aunt', () => {
    // uncle → alice: uncle parent→grandpa child→father parent→alice child
    // pattern UDD
    // uncle (male, 1967) is uncle of alice (female)
    // compareAge(uncle, father) → uncle is younger than father (1967 > 1965 is false, so younger)
    // Actually compareAge(a,b) returns 'older' if a.birthYear < b.birthYear
    // compareAge(uncle(1967), father(1965)) → 1967 > 1965 → 'younger'
    expect(labelFor(['uncle', 'grandpa', 'father', 'alice'], 0, 3)).toBe('relUnclePaternalYounger');
  });

  it('cousins (U^n D^n, n>=2) → tang / biao siblings', () => {
    // alice → cousin:
    // alice child→father parent→grandpa parent→uncle child→cousin child
    // pattern UUDD (n=2)
    // alice (female, 1990) and cousin (male, 1995)
    // compareAge(alice, cousin): 1990 < 1995 → 'older'
    // siblingLabel('female', 'male', alice, cousin) → relOlderSister
    expect(labelFor(['alice', 'father', 'grandpa', 'uncle', 'cousin'], 0, 4)).toBe('relTang' + 'relOlderSister');

    // charlie → cousin:
    // charlie child→alice child→father parent→grandpa parent→uncle child→cousin child
    // pattern UUUDD (n=3)
    // isTangRelation checks if all intermediaries are male:
    //   upSteps: charlie→alice (alice is female), alice→father (father is male)
    //   Since alice is female, isTangRelation returns false → prefix = 'relBiao'
    // charlie (male, 2015) and cousin (male, 1995)
    // compareAge(charlie, cousin): 2015 > 1995 → 'younger'
    // siblingLabel('male', 'male', charlie, cousin) → relYoungerBrother
    // But wait - UUUDD has uCount=3, dCount=2, which matches the extended nephew/niece rule U^(n+1)D^n (n=2)
    // That rule has priority over the cousin rule in the KINSHIP_RULES array!
    expect(labelFor(['charlie', 'alice', 'father', 'grandpa', 'uncle', 'cousin'], 0, 5)).toBe('relBiao' + 'relNephew');
  });
});

// ─── computeVisibleChain ────────────────────────────────────────────────────

describe('computeVisibleChain', () => {
  it('returns full chain when no collapsed nodes', () => {
    const chain = buildChain(persons, ['charlie', 'alice', 'father', 'grandpa']);
    const visible = computeVisibleChain(persons, chain);
    expect(visible.nodes).toHaveLength(4);
    expect(visible.edges).toHaveLength(3);
    expect(visible.nodes.map(n => n.label)).toEqual(['Charlie', 'Alice', '父亲', '爷爷']);
  });

  it('skips collapsed middle nodes and composes edge labels', () => {
    const chain = buildChain(persons, ['charlie', 'alice', 'father', 'grandpa']);
    // Collapse alice and father (middle nodes)
    chain.nodes[1].collapsed = true;
    chain.nodes[2].collapsed = true;

    const visible = computeVisibleChain(persons, chain);
    // Should show charlie and grandpa only
    expect(visible.nodes).toHaveLength(2);
    expect(visible.nodes[0].label).toBe('Charlie');
    expect(visible.nodes[1].label).toBe('爷爷');
    expect(visible.edges).toHaveLength(1);
    // The edge label should be composed from charlie → grandpa (UUU pattern)
    expect(visible.edges[0].label).toBe('relGreatGrandson');
  });

  it('preserves branch info on uncollapsed nodes when non-adjacent', () => {
    // Build chain: uncle → grandpa → father → alice
    const chain = buildChain(persons, ['uncle', 'grandpa', 'father', 'alice']);
    // grandpa is at index 1 and has branch info
    expect(chain.nodes[1].branch).toBeDefined();
    expect(chain.nodes[1].branch!.personId).toBe('grandma');

    // Collapse only father (middle node) — grandpa stays visible with branch
    chain.nodes[2].collapsed = true;

    const visible = computeVisibleChain(persons, chain);
    // uncle, grandpa, alice remain (3 nodes, 2 edges)
    expect(visible.nodes).toHaveLength(3);
    expect(visible.nodes[0].label).toBe('叔叔');
    expect(visible.nodes[1].label).toBe('爷爷');
    // grandpa is still visible, so its branch info is preserved
    expect(visible.nodes[1].branch).toBeDefined();
    expect(visible.nodes[1].branch!.personId).toBe('grandma');
    expect(visible.nodes[2].label).toBe('Alice');
  });
});
