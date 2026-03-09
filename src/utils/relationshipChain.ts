import type { Person, Gender } from '../types';

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
    if (from.gender === 'male') return '丈夫';
    if (from.gender === 'female') return '妻子';
    return '配偶';
  }

  if (direction === 'parent') {
    if (from.gender === 'male') return '父亲';
    if (from.gender === 'female') return '母亲';
    return '父亲/母亲';
  }

  if (direction === 'child') {
    if (from.gender === 'male') return '儿子';
    if (from.gender === 'female') return '女儿';
    return '儿子/女儿';
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

  return '非亲戚';
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

function genderLabel(g: Gender, male: string, female: string, unknown?: string): string {
  if (g === 'male') return male;
  if (g === 'female') return female;
  return unknown ?? `${male}/${female}`;
}

function siblingLabel(sg: Gender, eg: Gender, startPerson: Person, endPerson: Person): string {
  const older = compareAge(startPerson, endPerson);
  if (sg === 'male' && eg === 'male') {
    if (older === 'older') return '哥哥';
    if (older === 'younger') return '弟弟';
    return '哥哥/弟弟';
  }
  if (sg === 'male' && eg === 'female') {
    if (older === 'older') return '哥哥';
    if (older === 'younger') return '弟弟';
    return '哥哥/弟弟';
  }
  if (sg === 'female' && eg === 'male') {
    if (older === 'older') return '姐姐';
    if (older === 'younger') return '妹妹';
    return '姐姐/妹妹';
  }
  if (sg === 'female' && eg === 'female') {
    if (older === 'older') return '姐姐';
    if (older === 'younger') return '妹妹';
    return '姐姐/妹妹';
  }
  return '兄弟姐妹';
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
    emit: ({ sg }) => genderLabel(sg, '儿子', '女儿'),
  },

  // === Direct: D (parent→child, start is parent of end) ===
  {
    match: exactMatch('D'),
    emit: ({ sg }) => genderLabel(sg, '父亲', '母亲'),
  },

  // === Direct: S (spouse) ===
  {
    match: exactMatch('S'),
    emit: ({ sg }) => genderLabel(sg, '丈夫', '妻子', '配偶'),
  },

  // === Grandchild: UU, UUS (start is grandchild of end/end's spouse) ===
  {
    match: exactMatch('UU', 'UUS'),
    emit: (ctx) => {
      const pg = firstParentGender(ctx.steps, ctx.persons);
      if (pg === 'male') return genderLabel(ctx.sg, '孙子', '孙女');
      return genderLabel(ctx.sg, '外孙', '外孙女');
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
      if (childGender === 'male') return genderLabel(ctx.sg, '爷爷', '奶奶');
      return genderLabel(ctx.sg, '外公', '外婆');
    },
  },

  // === Great-grandchild: UUU, UUUS ===
  {
    match: exactMatch('UUU', 'UUUS'),
    emit: ({ sg }) => genderLabel(sg, '曾孙', '曾孙女'),
  },

  // === Great-grandparent: DDD, SDDD ===
  {
    match: exactMatch('DDD', 'SDDD'),
    emit: ({ sg }) => genderLabel(sg, '曾祖父', '曾祖母'),
  },

  // === Siblings: UD ===
  {
    match: exactMatch('UD'),
    emit: (ctx) => siblingLabel(ctx.sg, ctx.eg, ctx.startPerson, ctx.endPerson),
  },

  // === Parent's spouse (step-parent ≈ parent): US ===
  {
    match: exactMatch('US'),
    emit: ({ sg }) => genderLabel(sg, '儿子', '女儿'),
  },

  // === Spouse's child (step-child ≈ child): SD ===
  {
    match: exactMatch('SD'),
    emit: ({ sg }) => genderLabel(sg, '父亲', '母亲', '父亲/母亲'),
  },

  // === Uncle/Aunt (start goes up 2, down 1): UUD ===
  {
    match: exactMatch('UUD'),
    emit: (ctx) => {
      const pg = firstParentGender(ctx.steps, ctx.persons);
      if (pg === 'male') return genderLabel(ctx.sg, '侄子', '侄女');
      return genderLabel(ctx.sg, '外甥', '外甥女');
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
        if (ctx.sg === 'female') return '姑姑';
        if (ctx.sg === 'male') {
          const older = compareAge(ctx.startPerson, endParent!);
          if (older === 'older') return '伯父';
          if (older === 'younger') return '叔叔';
          return '伯父/叔叔';
        }
        return '伯父/叔叔/姑姑';
      }
      if (endParentGender === 'female') {
        if (ctx.sg === 'male') return '舅舅';
        if (ctx.sg === 'female') {
          const older = compareAge(ctx.startPerson, endParent!);
          if (older === 'older') return '大姨';
          if (older === 'younger') return '小姨';
          return '大姨/小姨';
        }
        return '舅舅/姨妈';
      }
      return '叔伯/舅/姑/姨';
    },
  },

  // === Cousins: U^nD^n (n≥2) — 堂/表兄弟姐妹 (shared ancestor n generations up) ===
  {
    match: (p) => { const m = matchUpDown(p, 2, 2); return m != null && m.uCount === m.dCount; },
    emit: (ctx) => {
      const { upSteps, downSteps } = splitUpDown(ctx.steps);
      const tang = isTangRelation(upSteps, downSteps, ctx.persons);
      const prefix = tang ? '堂' : '表';
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
      const prefix = tang ? '堂' : '表';
      if (ctx.eg === 'female') return `${prefix}姑姑`;
      const older = compareAge(ctx.endPerson, ctx.startPerson);
      if (ctx.eg === 'male') {
        if (older === 'older') return `${prefix}伯父`;
        if (older === 'younger') return `${prefix}叔叔`;
        return `${prefix}伯父/${prefix}叔叔`;
      }
      return `${prefix}伯父/${prefix}叔叔/${prefix}姑姑`;
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
      const prefix = tang ? '堂' : '表';
      return prefix + genderLabel(ctx.sg, '侄子', '侄女');
    },
  },

  // === Parent-in-law: SU (start is child-in-law of end) ===
  {
    match: exactMatch('SU'),
    emit: (ctx) => {
      if (ctx.eg === 'male') return genderLabel(ctx.sg, '女婿', '儿媳');
      if (ctx.eg === 'female') return genderLabel(ctx.sg, '女婿', '儿媳');
      return genderLabel(ctx.sg, '女婿', '儿媳');
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

      if (childGender === 'male') return genderLabel(ctx.sg, '公公', '婆婆');
      if (childGender === 'female') return genderLabel(ctx.sg, '岳父', '岳母');
      return genderLabel(ctx.sg, '公公/岳父', '婆婆/岳母');
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
      if (childGender === 'male') return genderLabel(ctx.sg, '爷爷', '奶奶');
      if (childGender === 'female') return genderLabel(ctx.sg, '外公', '外婆');
      return genderLabel(ctx.sg, '爷爷/外公', '奶奶/外婆');
    },
  },

  // === Grandparent-in-law: SUU (start is grandchild-in-law of end) ===
  {
    match: exactMatch('SUU'),
    emit: (ctx) => {
      const spouseStep = ctx.steps[0];
      const spouseId = spouseStep.toId;
      const spouse = spouseId ? ctx.persons[spouseId] : undefined;
      if (spouse?.gender === 'male') return genderLabel(ctx.sg, '孙女婿', '孙媳妇');
      if (spouse?.gender === 'female') return genderLabel(ctx.sg, '孙女婿', '孙媳妇');
      return genderLabel(ctx.sg, '孙女婿', '孙媳妇');
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
          if (older === 'younger') return '小叔子';
          return '小叔子';
        }
        return '小姑子';
      }
      if (spouseGender === 'female') {
        if (ctx.eg === 'male') return '小舅子';
        return '小姨子';
      }
      return '小叔子/小舅子';
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
        if (older === 'older') return '嫂子';
        if (older === 'younger') return '弟妹';
        return '嫂子/弟妹';
      }
      if (sibGender === 'female') {
        const older = compareAge(sibling!, ctx.startPerson);
        if (older === 'older') return '姐夫';
        if (older === 'younger') return '妹夫';
        return '姐夫/妹夫';
      }
      return '姐夫/妹夫/嫂子/弟妹';
    },
  },

  // === Nephew/niece's spouse → uncle/aunt: SUUD ===
  // Start person is the spouse of a nephew/niece of end person.
  // 媳妇 if start is female, 女婿 if start is male.
  // 侄 if nephew/niece's parent is male (end's brother), 外甥 if female (end's sister).
  {
    match: exactMatch('SUUD'),
    emit: (ctx) => {
      // steps: S(start→nephew), U(nephew→parent), U(parent→grandparent), D(grandparent→end)
      // The nephew/niece's parent gender determines 侄 vs 外甥
      const upSteps = ctx.steps.filter(s => s.dir === 'child');
      const firstParent = upSteps[0] ? ctx.persons[upSteps[0].toId] : undefined;
      const parentGender = firstParent?.gender ?? 'unknown';
      // Start person's gender determines 媳妇 vs 女婿
      const suffix = ctx.sg === 'male' ? '女婿' : '媳妇';

      if (parentGender === 'male') {
        return `侄${suffix}`;
      }
      if (parentGender === 'female') {
        return `外甥${suffix}`;
      }
      return `侄${suffix}/外甥${suffix}`;
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
        if (ctx.sg === 'female') return '姑姑';
        if (ctx.sg === 'male') {
          const older = compareAge(ctx.startPerson, endParent!);
          if (older === 'older') return '伯父';
          if (older === 'younger') return '叔叔';
          return '伯父/叔叔';
        }
        return '伯父/叔叔/姑姑';
      }
      if (endParentGender === 'female') {
        if (ctx.sg === 'male') return '舅舅';
        if (ctx.sg === 'female') {
          const older = compareAge(ctx.startPerson, endParent!);
          if (older === 'older') return '大姨';
          if (older === 'younger') return '小姨';
          return '大姨/小姨';
        }
        return '舅舅/姨妈';
      }
      return '叔伯/舅/姑/姨';
    },
  },

  // === Nephew/niece → uncle/aunt's spouse: UUDS ===
  {
    match: exactMatch('UUDS'),
    emit: (ctx) => {
      const upSteps = ctx.steps.filter(s => s.dir === 'child');
      const pg = upSteps[0] ? ctx.persons[upSteps[0].toId]?.gender : 'unknown';

      if (pg === 'male') return genderLabel(ctx.sg, '侄子', '侄女');
      return genderLabel(ctx.sg, '外甥', '外甥女');
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
        if (spouseGender === 'female') return '姑父';
        if (spouseGender === 'male') {
          const older = compareAge(spouse!, sibling!);
          if (older === 'older') return '伯母';
          if (older === 'younger') return '婶婶';
          return '伯母/婶婶';
        }
        return '伯母/婶婶/姑父';
      }
      if (sibGender === 'female') {
        if (spouseGender === 'male') return '姨父';
        if (spouseGender === 'female') return '舅母';
        return '舅母/姨父';
      }
      return '伯母/婶婶/舅母/姑父/姨父';
    },
  },

  // === Spouse's sibling's spouse (妯娌/连襟): SUDS ===
  {
    match: exactMatch('SUDS'),
    emit: (ctx) => {
      if (ctx.sg === 'female' && ctx.eg === 'female') return '妯娌';
      if (ctx.sg === 'male' && ctx.eg === 'male') return '连襟';
      return '妯娌/连襟';
    },
  },

  // === Cousin's spouse / Spouse's cousin: SUUDD, UUDDS ===
  {
    match: exactMatch('SUUDD', 'UUDDS'),
    emit: (ctx) => {
      const coreSteps = ctx.steps.filter(s => s.dir !== 'spouse');
      const { upSteps, downSteps } = splitUpDown(coreSteps);
      const tang = isTangRelation(upSteps, downSteps, ctx.persons);
      const prefix = tang ? '堂' : '表';

      const pattern = ctx.steps.map(s => stepCode(s.dir)).join('');
      if (pattern === 'UUDDS') {
        // start is cousin of end's spouse → start is 小叔子/小姑子/小舅子/小姨子 of end
        const spouseStep = ctx.steps[ctx.steps.length - 1];
        const cousinId = spouseStep.fromId;
        const cousin = ctx.persons[cousinId];
        const cousinGender = cousin?.gender ?? 'unknown';

        if (cousinGender === 'male') {
          if (ctx.sg === 'male') return `${prefix}小叔子`;
          return `${prefix}小姑子`;
        }
        if (cousinGender === 'female') {
          if (ctx.sg === 'male') return `${prefix}小舅子`;
          return `${prefix}小姨子`;
        }
        return `${prefix}亲属`;
      }

      // SUUDD: start is spouse of a cousin of end → start is 嫂子/弟妹/姐夫/妹夫 of end
      const spouseStep = ctx.steps.find(s => s.dir === 'spouse');
      const spouseId = spouseStep?.toId;
      const spouse = spouseId ? ctx.persons[spouseId] : undefined;
      const spouseGender = spouse?.gender ?? 'unknown';

      if (spouseGender === 'male') {
        const older = compareAge(spouse!, ctx.endPerson);
        if (older === 'older') return `${prefix}嫂子`;
        if (older === 'younger') return `${prefix}弟妹`;
        return `${prefix}嫂子/${prefix}弟妹`;
      }
      if (spouseGender === 'female') {
        const older = compareAge(spouse!, ctx.endPerson);
        if (older === 'older') return `${prefix}姐夫`;
        if (older === 'younger') return `${prefix}妹夫`;
        return `${prefix}姐夫/${prefix}妹夫`;
      }
      return `${prefix}姐夫/${prefix}妹夫/${prefix}嫂子/${prefix}弟妹`;
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
