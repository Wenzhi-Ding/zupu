import type { Person, Gender } from '../types';
import { t } from '../i18n';

export type EdgeDirection = 'parent' | 'child' | 'spouse';

export interface PathEdge {
  fromId: string;
  toId: string;
  direction: EdgeDirection;
}

export interface ChainNode {
  personIds: string[];
  label: string;
  collapsed: boolean;
  collapsible: boolean;
  /** If this is a branch node, holds the other parent's info */
  branch?: {
    personId: string;
    label: string;
    edgeBefore: string;
    edgeAfter: string;
  };
}

export interface ChainEdge {
  label: string;
}

export interface RelationChain {
  nodes: ChainNode[];
  edges: ChainEdge[];
}

export function getEdgeDirection(
  persons: Record<string, Person>,
  fromId: string,
  toId: string,
): EdgeDirection {
  const from = persons[fromId];
  if (!from) return 'spouse';
  if (from.childrenIds.includes(toId)) return 'parent';
  if (from.parentIds.includes(toId)) return 'child';
  if (from.spouseIds.includes(toId)) return 'spouse';
  return 'spouse';
}

/**
 * Directional edge label: "from is [X] of to".
 * E.g., if from is parent of to (direction='parent'), label is 父亲/母亲.
 * If from is child of to (direction='child'), label is 儿子/女儿.
 */
function singleEdgeLabel(
  persons: Record<string, Person>,
  fromId: string,
  toId: string,
  direction: EdgeDirection,
): string {
  const from = persons[fromId];
  const to = persons[toId];
  if (!from || !to) return '?';

  if (direction === 'spouse') {
    if (from.gender === 'male') return t('relHusband');
    if (from.gender === 'female') return t('relWife');
    return t('relSpouse');
  }

  if (direction === 'parent') {
    if (from.gender === 'male') return t('relFather');
    if (from.gender === 'female') return t('relMother');
    return t('relFatherOrMother');
  }

  if (direction === 'child') {
    if (from.gender === 'male') return t('relSon');
    if (from.gender === 'female') return t('relDaughter');
    return t('relSonOrDaughter');
  }

  return '?';
}

export function computePathEdges(
  persons: Record<string, Person>,
  path: string[],
): PathEdge[] {
  const edges: PathEdge[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    edges.push({
      fromId: path[i],
      toId: path[i + 1],
      direction: getEdgeDirection(persons, path[i], path[i + 1]),
    });
  }
  return edges;
}

/**
 * Find the other parent (spouse) of a node that is also a parent of the next/prev node.
 * For a node at index `idx` in the path, check if the prev node (idx-1) and next node (idx+1)
 * share another common parent besides this node.
 */
function findBranchSpouse(
  persons: Record<string, Person>,
  path: string[],
  idx: number,
): string | null {
  if (idx <= 0 || idx >= path.length - 1) return null;

  const currentId = path[idx];
  const prevId = path[idx - 1];
  const nextId = path[idx + 1];
  const current = persons[currentId];
  const prev = persons[prevId];
  const next = persons[nextId];
  if (!current || !prev || !next) return null;

  // Check: is current a parent of both prev and next? (path goes child→parent→child)
  const prevDir = getEdgeDirection(persons, prevId, currentId);
  const nextDir = getEdgeDirection(persons, currentId, nextId);

  if (prevDir !== 'child' || nextDir !== 'parent') return null;

  // current is a parent; prev and next are both children of current
  // Find spouse of current who is also a parent of both prev and next
  for (const spouseId of current.spouseIds) {
    if (spouseId === currentId) continue;
    const spouse = persons[spouseId];
    if (!spouse) continue;
    // spouse must be parent of both prev and next
    if (spouse.childrenIds.includes(prevId) && spouse.childrenIds.includes(nextId)) {
      return spouseId;
    }
  }
  return null;
}

export function buildChain(
  persons: Record<string, Person>,
  path: string[],
): RelationChain {
  if (path.length === 0) return { nodes: [], edges: [] };
  if (path.length === 1) {
    return {
      nodes: [{
        personIds: [path[0]],
        label: persons[path[0]]?.name ?? '?',
        collapsed: false,
        collapsible: false,
      }],
      edges: [],
    };
  }

  // No spouse merging — each person is its own node
  const chainNodes: ChainNode[] = path.map((id, idx) => ({
    personIds: [id],
    label: persons[id]?.name ?? '?',
    collapsed: false,
    collapsible: idx > 0 && idx < path.length - 1,
  }));

  // Detect branch nodes (shared parents)
  for (let idx = 1; idx < path.length - 1; idx++) {
    const branchSpouseId = findBranchSpouse(persons, path, idx);
    if (branchSpouseId) {
      const spouse = persons[branchSpouseId];
      const prevId = path[idx - 1];
      const nextId = path[idx + 1];
      chainNodes[idx].branch = {
        personId: branchSpouseId,
        label: spouse?.name ?? '?',
        edgeBefore: singleEdgeLabel(persons, prevId, branchSpouseId, getEdgeDirection(persons, prevId, branchSpouseId)),
        edgeAfter: singleEdgeLabel(persons, branchSpouseId, nextId, getEdgeDirection(persons, branchSpouseId, nextId)),
      };
    }
  }

  const chainEdges: ChainEdge[] = [];
  for (let j = 0; j < chainNodes.length - 1; j++) {
    const fromId = chainNodes[j].personIds[0];
    const toId = chainNodes[j + 1].personIds[0];
    const dir = getEdgeDirection(persons, fromId, toId);
    chainEdges.push({
      label: singleEdgeLabel(persons, fromId, toId, dir),
    });
  }

  return { nodes: chainNodes, edges: chainEdges };
}

type RelStep = { dir: EdgeDirection; fromId: string; toId: string };

function getStepsBetweenNodes(
  persons: Record<string, Person>,
  chain: RelationChain,
  fromNodeIdx: number,
  toNodeIdx: number,
): RelStep[] {
  const steps: RelStep[] = [];
  for (let i = fromNodeIdx; i < toNodeIdx; i++) {
    const fromNode = chain.nodes[i];
    const toNode = chain.nodes[i + 1];
    const fromPersonId = fromNode.personIds[fromNode.personIds.length - 1];
    const toPersonId = toNode.personIds[0];
    const dir = getEdgeDirection(persons, fromPersonId, toPersonId);
    steps.push({ dir, fromId: fromPersonId, toId: toPersonId });
  }
  return steps;
}

/**
 * Pattern-matching allowlist for Chinese kinship labels.
 * Encodes BFS path as U (child→parent), D (parent→child), S (spouse) steps.
 * Each rule: pattern string → label function. Unmatched patterns → "非亲戚".
 *
 * Direction convention: labels are always "start is [X] of end" (left-to-right).
 */
export function composeRelationshipLabel(
  persons: Record<string, Person>,
  chain: RelationChain,
  fromNodeIdx: number,
  toNodeIdx: number,
): string {
  const steps = getStepsBetweenNodes(persons, chain, fromNodeIdx, toNodeIdx);
  if (steps.length === 0) return '?';
  if (steps.length === 1) {
    return singleEdgeLabel(persons, steps[0].fromId, steps[0].toId, steps[0].dir);
  }

  const startNode = chain.nodes[fromNodeIdx];
  const endNode = chain.nodes[toNodeIdx];
  const startPersonId = startNode.personIds[0];
  const endPersonId = endNode.personIds[endNode.personIds.length - 1];
  const startPerson = persons[startPersonId];
  const endPerson = persons[endPersonId];
  if (!startPerson || !endPerson) return '?';

  const sg = startPerson.gender;
  const eg = endPerson.gender;
  const pattern = steps.map(s => stepCode(s.dir)).join('');

  const ctx: MatchContext = { sg, eg, steps, persons, startPerson, endPerson };

  for (const rule of KINSHIP_RULES) {
    if (rule.match(pattern, ctx)) {
      return rule.emit(ctx);
    }
  }

  return t('relNonRelative');
}

type StepCode = 'U' | 'D' | 'S';

function stepCode(dir: EdgeDirection): StepCode {
  if (dir === 'child') return 'U';
  if (dir === 'parent') return 'D';
  return 'S';
}

interface MatchContext {
  sg: Gender;
  eg: Gender;
  steps: RelStep[];
  persons: Record<string, Person>;
  startPerson: Person;
  endPerson: Person;
}

interface KinshipRule {
  match(pattern: string, ctx: MatchContext): boolean;
  emit(ctx: MatchContext): string;
}

function exactMatch(...patterns: string[]): (p: string) => boolean {
  const set = new Set(patterns);
  return (p: string) => set.has(p);
}

/**
 * Match U^m D^n patterns where m >= minU and n >= minD.
 * Returns the (m, n) counts on match, or null.
 */
function matchUpDown(pattern: string, minU: number, minD: number): { uCount: number; dCount: number } | null {
  const m = /^(U+)(D+)$/.exec(pattern);
  if (!m) return null;
  const uCount = m[1].length;
  const dCount = m[2].length;
  if (uCount >= minU && dCount >= minD) return { uCount, dCount };
  return null;
}

function genderLabel(g: Gender, maleKey: string, femaleKey: string, unknownKey?: string): string {
  if (g === 'male') return t(maleKey as any);
  if (g === 'female') return t(femaleKey as any);
  return unknownKey ? t(unknownKey as any) : `${t(maleKey as any)}/${t(femaleKey as any)}`;
}

function siblingLabel(sg: Gender, eg: Gender, startPerson: Person, endPerson: Person): string {
  const older = compareAge(startPerson, endPerson);
  if (sg === 'male' && eg === 'male') {
    if (older === 'older') return t('relOlderBrother');
    if (older === 'younger') return t('relYoungerBrother');
    return t('relBrother');
  }
  if (sg === 'male' && eg === 'female') {
    if (older === 'older') return t('relOlderBrother');
    if (older === 'younger') return t('relYoungerBrother');
    return t('relBrother');
  }
  if (sg === 'female' && eg === 'male') {
    if (older === 'older') return t('relOlderSister');
    if (older === 'younger') return t('relYoungerSister');
    return t('relSister');
  }
  if (sg === 'female' && eg === 'female') {
    if (older === 'older') return t('relOlderSister');
    if (older === 'younger') return t('relYoungerSister');
    return t('relSister');
  }
  return t('relSiblings');
}

function compareAge(a: Person, b: Person): 'older' | 'younger' | 'unknown' {
  if (a.birthYear != null && b.birthYear != null) {
    if (a.birthYear < b.birthYear) return 'older';
    if (a.birthYear > b.birthYear) return 'younger';
  }
  return 'unknown';
}

function isTangRelation(
  upSteps: RelStep[],
  downSteps: RelStep[],
  persons: Record<string, Person>,
): boolean {
  for (let i = 0; i < upSteps.length - 1; i++) {
    const intermediary = persons[upSteps[i].toId];
    if (intermediary && intermediary.gender !== 'male') return false;
  }
  for (let i = 0; i < downSteps.length - 1; i++) {
    const intermediary = persons[downSteps[i].toId];
    if (intermediary && intermediary.gender !== 'male') return false;
  }
  return true;
}

function splitUpDown(steps: RelStep[]): { upSteps: RelStep[]; downSteps: RelStep[] } {
  const upSteps: RelStep[] = [];
  const downSteps: RelStep[] = [];
  for (const s of steps) {
    if (s.dir === 'child') upSteps.push(s);
    else if (s.dir === 'parent') downSteps.push(s);
  }
  return { upSteps, downSteps };
}

function firstParentGender(steps: RelStep[], persons: Record<string, Person>): Gender {
  const firstUp = steps.find(s => s.dir === 'child');
  if (!firstUp) return 'unknown';
  return persons[firstUp.toId]?.gender ?? 'unknown';
}


const KINSHIP_RULES: KinshipRule[] = [
  // === Direct: U (child→parent, start is child of end) ===
  {
    match: exactMatch('U'),
    emit: ({ sg }) => genderLabel(sg, 'relSon', 'relDaughter'),
  },

  // === Direct: D (parent→child, start is parent of end) ===
  {
    match: exactMatch('D'),
    emit: ({ sg }) => genderLabel(sg, 'relFather', 'relMother'),
  },

  // === Direct: S (spouse) ===
  {
    match: exactMatch('S'),
    emit: ({ sg }) => genderLabel(sg, 'relHusband', 'relWife', 'relSpouse'),
  },

  // === Grandchild: UU, UUS (start is grandchild of end/end's spouse) ===
  {
    match: exactMatch('UU', 'UUS'),
    emit: (ctx) => {
      const pg = firstParentGender(ctx.steps, ctx.persons);
      if (pg === 'male') return genderLabel(ctx.sg, 'relGrandson', 'relGranddaughter');
      return genderLabel(ctx.sg, 'relMaternalGrandson', 'relMaternalGranddaughter');
    },
  },

  // === Grandparent: DD, SDD (start is grandparent of end/end via spouse) ===
  {
    match: exactMatch('DD', 'SDD'),
    emit: (ctx) => {
      const dSteps = ctx.steps.filter(s => s.dir === 'parent');
      const firstChildId = dSteps[0]?.toId;
      const firstChild = firstChildId ? ctx.persons[firstChildId] : undefined;
      const childGender = firstChild?.gender ?? 'unknown';
      if (childGender === 'male') return genderLabel(ctx.sg, 'relGrandpa', 'relGrandma');
      return genderLabel(ctx.sg, 'relMaternalGrandpa', 'relMaternalGrandma');
    },
  },

  // === Great-grandchild: UUU, UUUS ===
  {
    match: exactMatch('UUU', 'UUUS'),
    emit: ({ sg }) => genderLabel(sg, 'relGreatGrandson', 'relGreatGranddaughter'),
  },

  // === Great-grandparent: DDD, SDDD ===
  {
    match: exactMatch('DDD', 'SDDD'),
    emit: ({ sg }) => genderLabel(sg, 'relGreatGrandfather', 'relGreatGrandmother'),
  },

  // === Siblings: UD ===
  {
    match: exactMatch('UD'),
    emit: (ctx) => siblingLabel(ctx.sg, ctx.eg, ctx.startPerson, ctx.endPerson),
  },

  // === Parent's spouse (step-parent ≈ parent): US ===
  {
    match: exactMatch('US'),
    emit: ({ sg }) => genderLabel(sg, 'relSon', 'relDaughter'),
  },

  // === Spouse's child (step-child ≈ child): SD ===
  {
    match: exactMatch('SD'),
    emit: ({ sg }) => genderLabel(sg, 'relFather', 'relMother', 'relFatherOrMother'),
  },

  // === Uncle/Aunt (start goes up 2, down 1): UUD ===
  {
    match: exactMatch('UUD'),
    emit: (ctx) => {
      const pg = firstParentGender(ctx.steps, ctx.persons);
      if (pg === 'male') return genderLabel(ctx.sg, 'relNephew', 'relNiece');
      return genderLabel(ctx.sg, 'relMaternalNephew', 'relMaternalNiece');
    },
  },

  // === Nephew/Niece (start goes up 1, down 2): UDD ===
  {
    match: exactMatch('UDD'),
    emit: (ctx) => {
      const dSteps = ctx.steps.filter(s => s.dir === 'parent');
      const endParentId = dSteps[0]?.toId;
      const endParent = endParentId ? ctx.persons[endParentId] : undefined;
      const endParentGender = endParent?.gender ?? 'unknown';

      if (endParentGender === 'male') {
        if (ctx.sg === 'female') return t('relAuntPaternal');
        if (ctx.sg === 'male') {
          const older = compareAge(ctx.startPerson, endParent!);
          if (older === 'older') return t('relUnclePaternalOlder');
          if (older === 'younger') return t('relUnclePaternalYounger');
          return t('relUnclePaternal');
        }
        return `${t('relUnclePaternal')}/${t('relAuntPaternal')}`;
      }
      if (endParentGender === 'female') {
        if (ctx.sg === 'male') return t('relUncleMaternal');
        if (ctx.sg === 'female') {
          const older = compareAge(ctx.startPerson, endParent!);
          if (older === 'older') return t('relAuntMaternalOlder');
          if (older === 'younger') return t('relAuntMaternalYounger');
          return t('relAuntMaternal');
        }
        return `${t('relUncleMaternal')}/${t('relAuntMaternal')}`;
      }
      return t('relUncleAuntGeneral');
    },
  },

  // === Cousins: U^nD^n (n≥2) — 堂/表兄弟姐妹 (shared ancestor n generations up) ===
  {
    match: (p) => { const m = matchUpDown(p, 2, 2); return m != null && m.uCount === m.dCount; },
    emit: (ctx) => {
      const { upSteps, downSteps } = splitUpDown(ctx.steps);
      const tang = isTangRelation(upSteps, downSteps, ctx.persons);
      const prefix = tang ? t('relTang') : t('relBiao');
      return prefix + siblingLabel(ctx.sg, ctx.eg, ctx.startPerson, ctx.endPerson);
    },
  },

  // === Extended uncle/aunt: U^nD^(n+1) (n≥2) — 堂/表叔伯姑 ===
  {
    match: (p) => {
      const m = matchUpDown(p, 2, 3);
      return m != null && m.dCount === m.uCount + 1;
    },
    emit: (ctx) => {
      const { upSteps, downSteps } = splitUpDown(ctx.steps);
      const tang = isTangRelation(upSteps, downSteps, ctx.persons);
      const prefix = tang ? t('relTang') : t('relBiao');
      if (ctx.eg === 'female') return `${prefix}${t('relAuntPaternal')}`;
      const older = compareAge(ctx.endPerson, ctx.startPerson);
      if (ctx.eg === 'male') {
        if (older === 'older') return `${prefix}${t('relUnclePaternalOlder')}`;
        if (older === 'younger') return `${prefix}${t('relUnclePaternalYounger')}`;
        return `${prefix}${t('relUnclePaternalOlder')}/${prefix}${t('relUnclePaternalYounger')}`;
      }
      return `${prefix}${t('relUnclePaternalOlder')}/${prefix}${t('relUnclePaternalYounger')}/${prefix}${t('relAuntPaternal')}`;
    },
  },

  // === Extended nephew/niece: U^(n+1)D^n (n≥2) — 堂/表侄 ===
  {
    match: (p) => {
      const m = matchUpDown(p, 3, 2);
      return m != null && m.uCount === m.dCount + 1;
    },
    emit: (ctx) => {
      const { upSteps, downSteps } = splitUpDown(ctx.steps);
      const tang = isTangRelation(upSteps, downSteps, ctx.persons);
      const prefix = tang ? t('relTang') : t('relBiao');
      return prefix + genderLabel(ctx.sg, 'relNephew', 'relNiece');
    },
  },

  // === Parent-in-law: SU (start is child-in-law of end) ===
  {
    match: exactMatch('SU'),
    emit: (ctx) => {
      if (ctx.eg === 'male') return genderLabel(ctx.sg, 'relSonInLaw', 'relDaughterInLaw');
      if (ctx.eg === 'female') return genderLabel(ctx.sg, 'relSonInLaw', 'relDaughterInLaw');
      return genderLabel(ctx.sg, 'relSonInLaw', 'relDaughterInLaw');
    },
  },

  // === Child-in-law: DS (start is parent-in-law of end) ===
  {
    match: exactMatch('DS'),
    emit: (ctx) => {
      const childStep = ctx.steps.find(s => s.dir === 'parent');
      const childId = childStep?.toId;
      const child = childId ? ctx.persons[childId] : undefined;
      const childGender = child?.gender ?? 'unknown';

      if (childGender === 'male') return genderLabel(ctx.sg, 'relFatherInLawHusbandSide', 'relMotherInLawHusbandSide');
      if (childGender === 'female') return genderLabel(ctx.sg, 'relFatherInLawWifeSide', 'relMotherInLawWifeSide');
      return genderLabel(ctx.sg, 'relParentsInLaw', 'relMothersInLaw');
    },
  },

  // === Grandchild-in-law: DDS (start is grandparent-in-law of end) ===
  {
    match: exactMatch('DDS'),
    emit: (ctx) => {
      const dSteps = ctx.steps.filter(s => s.dir === 'parent');
      const firstChildId = dSteps[0]?.toId;
      const firstChild = firstChildId ? ctx.persons[firstChildId] : undefined;
      const childGender = firstChild?.gender ?? 'unknown';
      if (childGender === 'male') return genderLabel(ctx.sg, 'relGrandpa', 'relGrandma');
      if (childGender === 'female') return genderLabel(ctx.sg, 'relMaternalGrandpa', 'relMaternalGrandma');
      if (ctx.sg === 'male') return `${t('relGrandpa')}/${t('relMaternalGrandpa')}`;
      if (ctx.sg === 'female') return `${t('relGrandma')}/${t('relMaternalGrandma')}`;
      return `${t('relGrandpa')}/${t('relMaternalGrandpa')}/${t('relGrandma')}/${t('relMaternalGrandma')}`;
    },
  },

  // === Grandparent-in-law: SUU (start is grandchild-in-law of end) ===
  {
    match: exactMatch('SUU'),
    emit: (ctx) => {
      const spouseStep = ctx.steps[0];
      const spouseId = spouseStep.toId;
      const spouse = spouseId ? ctx.persons[spouseId] : undefined;
      if (spouse?.gender === 'male') return genderLabel(ctx.sg, 'relGrandsonInLaw', 'relGranddaughterInLaw');
      if (spouse?.gender === 'female') return genderLabel(ctx.sg, 'relGrandsonInLaw', 'relGranddaughterInLaw');
      return genderLabel(ctx.sg, 'relGrandsonInLaw', 'relGranddaughterInLaw');
    },
  },

  // === Spouse's sibling: SUD (start's spouse's sibling) ===
  {
    match: exactMatch('SUD'),
    emit: (ctx) => {
      const spouseStep = ctx.steps.find(s => s.dir === 'spouse');
      const spouseId = spouseStep?.toId;
      const spouse = spouseId ? ctx.persons[spouseId] : undefined;
      const spouseGender = spouse?.gender ?? 'unknown';

      if (spouseGender === 'male') {
        if (ctx.eg === 'male') {
          const older = compareAge(ctx.endPerson, spouse!);
          if (older === 'younger') return t('relBrotherInLawHusbandsYounger');
          return t('relBrotherInLawHusbandsYounger');
        }
        return t('relSisterInLawHusbandsSide');
      }
      if (spouseGender === 'female') {
        if (ctx.eg === 'male') return t('relBrotherInLawWifesSide');
        return t('relSisterInLawWifesSide');
      }
      return `${t('relBrotherInLawHusbandsYounger')}/${t('relBrotherInLawWifesSide')}`;
    },
  },

  // === Sibling's spouse: UDS (start's sibling's spouse) ===
  {
    match: exactMatch('UDS'),
    emit: (ctx) => {
      const siblingStep = ctx.steps.find(s => s.dir === 'parent');
      const siblingId = siblingStep?.toId;
      const sibling = siblingId ? ctx.persons[siblingId] : undefined;
      const sibGender = sibling?.gender ?? 'unknown';

      if (sibGender === 'male') {
        const older = compareAge(sibling!, ctx.startPerson);
        if (older === 'older') return t('relSisterInLawOlder');
        if (older === 'younger') return t('relSisterInLawYounger');
        return t('relSisterInLawGeneral');
      }
      if (sibGender === 'female') {
        const older = compareAge(sibling!, ctx.startPerson);
        if (older === 'older') return t('relBrotherInLawOlderSister');
        if (older === 'younger') return t('relBrotherInLawYoungerSister');
        return t('relBrotherInLawGeneral2');
      }
      return t('relAllInLawSiblings');
    },
  },

  // === Nephew/niece's spouse → uncle/aunt: SUUD ===
  {
    match: exactMatch('SUUD'),
    emit: (ctx) => {
      const upSteps = ctx.steps.filter(s => s.dir === 'child');
      const firstParent = upSteps[0] ? ctx.persons[upSteps[0].toId] : undefined;
      const parentGender = firstParent?.gender ?? 'unknown';

      if (parentGender === 'male') {
        return ctx.sg === 'male' ? t('relNephewHusband') : t('relNephewWife');
      }
      if (parentGender === 'female') {
        return ctx.sg === 'male' ? t('relMaternalNephewHusband') : t('relMaternalNephewWife');
      }
      return ctx.sg === 'male'
        ? `${t('relNephewHusband')}/${t('relMaternalNephewHusband')}`
        : `${t('relNephewWife')}/${t('relMaternalNephewWife')}`;
    },
  },

  // === Uncle/aunt → nephew/niece's spouse: UDDS ===
  {
    match: exactMatch('UDDS'),
    emit: (ctx) => {
      const dSteps = ctx.steps.filter(s => s.dir === 'parent');
      const endParentId = dSteps[0]?.toId;
      const endParent = endParentId ? ctx.persons[endParentId] : undefined;
      const endParentGender = endParent?.gender ?? 'unknown';

      if (endParentGender === 'male') {
        if (ctx.sg === 'female') return t('relAuntPaternal');
        if (ctx.sg === 'male') {
          const older = compareAge(ctx.startPerson, endParent!);
          if (older === 'older') return t('relUnclePaternalOlder');
          if (older === 'younger') return t('relUnclePaternalYounger');
          return t('relUnclePaternal');
        }
        return `${t('relUnclePaternal')}/${t('relAuntPaternal')}`;
      }
      if (endParentGender === 'female') {
        if (ctx.sg === 'male') return t('relUncleMaternal');
        if (ctx.sg === 'female') {
          const older = compareAge(ctx.startPerson, endParent!);
          if (older === 'older') return t('relAuntMaternalOlder');
          if (older === 'younger') return t('relAuntMaternalYounger');
          return t('relAuntMaternal');
        }
        return `${t('relUncleMaternal')}/${t('relAuntMaternal')}`;
      }
      return t('relUncleAuntGeneral');
    },
  },

  // === Nephew/niece → uncle/aunt's spouse: UUDS ===
  {
    match: exactMatch('UUDS'),
    emit: (ctx) => {
      const upSteps = ctx.steps.filter(s => s.dir === 'child');
      const pg = upSteps[0] ? ctx.persons[upSteps[0].toId]?.gender : 'unknown';

      if (pg === 'male') return genderLabel(ctx.sg, 'relNephew', 'relNiece');
      return genderLabel(ctx.sg, 'relMaternalNephew', 'relMaternalNiece');
    },
  },

  // === Uncle/aunt's spouse → nephew/niece: SUDD ===
  {
    match: exactMatch('SUDD'),
    emit: (ctx) => {
      const spouseStep = ctx.steps[0];
      const spouse = ctx.persons[spouseStep.toId];
      const spouseGender = spouse?.gender ?? 'unknown';
      const dSteps = ctx.steps.filter(s => s.dir === 'parent');
      const siblingId = dSteps[0]?.toId;
      const sibling = siblingId ? ctx.persons[siblingId] : undefined;
      const sibGender = sibling?.gender ?? 'unknown';

      if (sibGender === 'male') {
        if (spouseGender === 'female') return t('relAuntHusbandPaternal');
        if (spouseGender === 'male') {
          const older = compareAge(spouse!, sibling!);
          if (older === 'older') return t('relUncleWifeOlder');
          if (older === 'younger') return t('relUncleWifeYounger');
          return t('relUncleWife');
        }
        return `${t('relUncleWife')}/${t('relAuntHusbandPaternal')}`;
      }
      if (sibGender === 'female') {
        if (spouseGender === 'male') return t('relAuntHusbandMaternal');
        if (spouseGender === 'female') return t('relUncleWifeMaternal');
        return `${t('relUncleWifeMaternal')}/${t('relAuntHusbandMaternal')}`;
      }
      return t('relAllUncleAuntInLaw');
    },
  },

  // === Spouse's sibling's spouse (妯娌/连襟): SUDS ===
  {
    match: exactMatch('SUDS'),
    emit: (ctx) => {
      if (ctx.sg === 'female' && ctx.eg === 'female') return t('relSisterInLaw');
      if (ctx.sg === 'male' && ctx.eg === 'male') return t('relBrotherInLaw');
      return t('relSisterInLawGeneral3');
    },
  },

  // === Cousin's spouse / Spouse's cousin: SUUDD, UUDDS ===
  {
    match: exactMatch('SUUDD', 'UUDDS'),
    emit: (ctx) => {
      const coreSteps = ctx.steps.filter(s => s.dir !== 'spouse');
      const { upSteps, downSteps } = splitUpDown(coreSteps);
      const tang = isTangRelation(upSteps, downSteps, ctx.persons);
      const prefix = tang ? t('relTang') : t('relBiao');

      const pattern = ctx.steps.map(s => stepCode(s.dir)).join('');
      if (pattern === 'UUDDS') {
        // start is cousin of end's spouse
        const spouseStep = ctx.steps[ctx.steps.length - 1];
        const cousinId = spouseStep.fromId;
        const cousin = ctx.persons[cousinId];
        const cousinGender = cousin?.gender ?? 'unknown';

        if (cousinGender === 'male') {
          if (ctx.sg === 'male') return `${prefix}${t('relBrotherInLawHusbandsYounger')}`;
          return `${prefix}${t('relSisterInLawHusbandsSide')}`;
        }
        if (cousinGender === 'female') {
          if (ctx.sg === 'male') return `${prefix}${t('relBrotherInLawWifesSide')}`;
          return `${prefix}${t('relSisterInLawWifesSide')}`;
        }
        return `${prefix}${t('relRelative')}`;
      }

      // SUUDD: start is spouse of a cousin of end
      const spouseStep = ctx.steps.find(s => s.dir === 'spouse');
      const spouseId = spouseStep?.toId;
      const spouse = spouseId ? ctx.persons[spouseId] : undefined;
      const spouseGender = spouse?.gender ?? 'unknown';

      if (spouseGender === 'male') {
        const older = compareAge(spouse!, ctx.endPerson);
        if (older === 'older') return `${prefix}${t('relSisterInLawOlder')}`;
        if (older === 'younger') return `${prefix}${t('relSisterInLawYounger')}`;
        return `${prefix}${t('relSisterInLawOlder')}/${prefix}${t('relSisterInLawYounger')}`;
      }
      if (spouseGender === 'female') {
        const older = compareAge(spouse!, ctx.endPerson);
        if (older === 'older') return `${prefix}${t('relBrotherInLawOlderSister')}`;
        if (older === 'younger') return `${prefix}${t('relBrotherInLawYoungerSister')}`;
        return `${prefix}${t('relBrotherInLawOlderSister')}/${prefix}${t('relBrotherInLawYoungerSister')}`;
      }
      return `${prefix}${t('relBrotherInLawOlderSister')}/${prefix}${t('relBrotherInLawYoungerSister')}/${prefix}${t('relSisterInLawOlder')}/${prefix}${t('relSisterInLawYounger')}`;
    },
  },
];

export function computeVisibleChain(
  persons: Record<string, Person>,
  fullChain: RelationChain,
): { nodes: ChainNode[]; edges: ChainEdge[] } {
  if (fullChain.nodes.length <= 2) {
    return { nodes: fullChain.nodes, edges: fullChain.edges };
  }

  const visibleNodes: ChainNode[] = [];
  const visibleEdges: ChainEdge[] = [];
  let lastVisibleIdx = -1;

  for (let i = 0; i < fullChain.nodes.length; i++) {
    const node = fullChain.nodes[i];
    if (node.collapsed) continue;

    if (lastVisibleIdx === -1) {
      visibleNodes.push(node);
      lastVisibleIdx = i;
    } else {
      let edgeLabel: string;
      if (i === lastVisibleIdx + 1) {
        edgeLabel = fullChain.edges[lastVisibleIdx].label;
      } else {
        edgeLabel = composeRelationshipLabel(persons, fullChain, lastVisibleIdx, i);
      }
      visibleEdges.push({ label: edgeLabel });

      if (node.branch && i !== lastVisibleIdx + 1) {
        visibleNodes.push({
          ...node,
          branch: { ...node.branch, edgeBefore: edgeLabel },
        });
      } else {
        visibleNodes.push(node);
      }
      lastVisibleIdx = i;
    }
  }

  return { nodes: visibleNodes, edges: visibleEdges };
}
