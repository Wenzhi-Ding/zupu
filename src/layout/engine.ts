import type { Person } from '../types';

export interface FamilyUnit {
  id: string;
  personId: string;
  spouseIds: string[];
  childrenUnitIds: string[];
  generation: number;
  collapsed: boolean;
}

export interface CrossTreeLink {
  parentUnitId: string;
  childPersonId: string;
}

export interface LayoutResult {
  units: Map<string, FamilyUnit>;
  positions: Map<string, { x: number; y: number }>;
  personToUnit: Map<string, string>;
  rootUnitIds: string[];
  effectiveRootIds: string[];
  crossTreeLinks: CrossTreeLink[];
  crossTreeParentUnits: Set<string>;
  minGen: number;
  maxGen: number;
}

const CARD_WIDTH = 64;
const CARD_HEIGHT = 100;
const SIBLING_GAP = 30;
const COUPLE_GAP = 10;
const V_GAP = 50;

export function getLayoutConstants() {
  return { CARD_WIDTH, CARD_HEIGHT, H_GAP: SIBLING_GAP, V_GAP, COUPLE_GAP };
}

function unitWidth(unit: FamilyUnit): number {
  const totalPersons = 1 + unit.spouseIds.length;
  return CARD_WIDTH * totalPersons + COUPLE_GAP * (totalPersons - 1);
}

/**
 * Given a person and their spouseIds, compute the ordered list of person IDs
 * for rendering in a unit: male(s) on left, female(s) on right.
 * Within same gender, preserve spouseOrder (manual ordering).
 */
export function computeUnitPersonOrder(
  primaryId: string,
  spouseIdsList: string[],
  persons: Record<string, Person>,
  spouseOrder?: Record<string, string[]>,
): string[] {
  const allIds = [primaryId, ...spouseIdsList];
  const males: string[] = [];
  const females: string[] = [];
  const unknowns: string[] = [];

  for (const id of allIds) {
    const p = persons[id];
    if (!p) continue;
    if (p.gender === 'male') males.push(id);
    else if (p.gender === 'female') females.push(id);
    else unknowns.push(id);
  }

  const manualOrder = spouseOrder?.[primaryId];
  const orderIndex = (id: string) => {
    if (!manualOrder) return 999;
    const idx = manualOrder.indexOf(id);
    return idx === -1 ? 999 : idx;
  };

  males.sort((a, b) => {
    if (a === primaryId) return -1;
    if (b === primaryId) return 1;
    return orderIndex(a) - orderIndex(b);
  });
  females.sort((a, b) => {
    if (a === primaryId) return 1;
    if (b === primaryId) return -1;
    return orderIndex(a) - orderIndex(b);
  });
  unknowns.sort((a, b) => orderIndex(a) - orderIndex(b));

  return [...males, ...unknowns, ...females];
}

export function computeLayout(
  persons: Record<string, Person>,
  siblingOrder?: Record<string, string[]>,
): LayoutResult {
  const personList = Object.values(persons);
  if (personList.length === 0) {
    return { units: new Map(), positions: new Map(), personToUnit: new Map(), rootUnitIds: [], effectiveRootIds: [], crossTreeLinks: [], crossTreeParentUnits: new Set(), minGen: 0, maxGen: 0 };
  }

  const units = new Map<string, FamilyUnit>();
  const personToUnit = new Map<string, string>();
  const visited = new Set<string>();

  function getOrCreateUnit(personId: string): string {
    if (personToUnit.has(personId)) return personToUnit.get(personId)!;

    const person = persons[personId];
    if (!person) return '';

    for (const sid of person.spouseIds) {
      if (personToUnit.has(sid)) {
        const existingUnitId = personToUnit.get(sid)!;
        const existingUnit = units.get(existingUnitId)!;
        if (!existingUnit.spouseIds.includes(personId)) {
          existingUnit.spouseIds.push(personId);
        }
        personToUnit.set(personId, existingUnitId);
        return existingUnitId;
      }
    }

    const unitId = personId;
    const initialSpouseIds: string[] = [];
    for (const sid of person.spouseIds) {
      if (!personToUnit.has(sid) && persons[sid]) {
        initialSpouseIds.push(sid);
      }
    }

    const unit: FamilyUnit = {
      id: unitId,
      personId,
      spouseIds: initialSpouseIds,
      childrenUnitIds: [],
      generation: 0,
      collapsed: person.collapsed,
    };

    units.set(unitId, unit);
    personToUnit.set(personId, unitId);
    for (const sid of initialSpouseIds) {
      personToUnit.set(sid, unitId);
    }

    return unitId;
  }

  const childOwner = new Map<string, string>();

  function findRoots(): string[] {
    const roots: string[] = [];
    const processed = new Set<string>();

    for (const person of personList) {
      if (processed.has(person.id)) continue;

      let ancestor = person;
      const chain = new Set<string>();
      while (true) {
        chain.add(ancestor.id);
        const parentId = ancestor.parentIds.find((pid) => persons[pid] && !chain.has(pid));
        if (!parentId) break;
        ancestor = persons[parentId];
      }

      if (processed.has(ancestor.id)) continue;

      const unitId = getOrCreateUnit(ancestor.id);
      if (!roots.includes(unitId)) {
        roots.push(unitId);
      }

      processed.add(ancestor.id);
      const unit = units.get(unitId);
      if (unit) {
        for (const sid of unit.spouseIds) processed.add(sid);
      }
    }

    return roots;
  }

  const rootUnitIds = findRoots();

  function buildTree(unitId: string, generation: number) {
    const unit = units.get(unitId);
    if (!unit || visited.has(unitId)) return;
    visited.add(unitId);

    const primary = persons[unit.personId];
    unit.generation = primary?.generation ?? generation;

    if (!primary) return;

    const allChildrenIds = new Set<string>();
    for (const cid of primary.childrenIds) allChildrenIds.add(cid);
    for (const sid of unit.spouseIds) {
      const spouse = persons[sid];
      if (spouse) {
        for (const cid of spouse.childrenIds) allChildrenIds.add(cid);
      }
    }

    const sortedChildren = [...allChildrenIds]
      .filter((cid) => persons[cid])
      .sort((a, b) => {
        const manualOrder = siblingOrder?.[unit.personId];
        if (manualOrder) {
          const idxA = manualOrder.indexOf(a);
          const idxB = manualOrder.indexOf(b);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
        }
        return (persons[a].birthYear ?? 9999) - (persons[b].birthYear ?? 9999);
      });

    for (const childId of sortedChildren) {
      const childUnitId = getOrCreateUnit(childId);
      if (childUnitId !== unitId && !childOwner.has(childUnitId)) {
        if (!unit.childrenUnitIds.includes(childUnitId)) {
          unit.childrenUnitIds.push(childUnitId);
        }
        childOwner.set(childUnitId, unitId);
      }
    }

    if (!unit.collapsed) {
      for (const childUnitId of unit.childrenUnitIds) {
        buildTree(childUnitId, unit.generation + 1);
      }
    }
  }

  for (const rootId of rootUnitIds) {
    buildTree(rootId, 0);
  }

  const hiddenUnits = new Set<string>();

  function floodHideAllConnections(startPersonId: string, safePersons: Set<string>) {
    const toHide = new Set<string>();
    const queue = [startPersonId];

    while (queue.length > 0) {
      const pid = queue.pop()!;
      if (toHide.has(pid) || safePersons.has(pid)) continue;
      toHide.add(pid);

      const p = persons[pid];
      if (!p) continue;

      for (const sid of p.spouseIds) queue.push(sid);
      for (const cid of p.childrenIds) queue.push(cid);
      for (const parentId of p.parentIds) queue.push(parentId);
    }

    for (const pid of toHide) {
      const unitId = personToUnit.get(pid);
      if (unitId) hiddenUnits.add(unitId);
    }
  }

  for (const unit of units.values()) {
    // Build a safe set covering the entire unit + direct children persons,
    // so the upward-collapse flood never leaks into co-spouses or descendants.
    const buildUnitSafe = (u: FamilyUnit): Set<string> => {
      const safe = new Set<string>();
      safe.add(u.personId);
      for (const sid of u.spouseIds) safe.add(sid);
      for (const childUnitId of u.childrenUnitIds) {
        const childUnit = units.get(childUnitId);
        if (childUnit) {
          safe.add(childUnit.personId);
          for (const csid of childUnit.spouseIds) safe.add(csid);
        }
      }
      return safe;
    };

    const primary = persons[unit.personId];
    if (primary?.parentCollapsed) {
      const safePersons = buildUnitSafe(unit);
      for (const parentId of primary.parentIds) {
        floodHideAllConnections(parentId, safePersons);
      }
    }
    for (const sid of unit.spouseIds) {
      const spouse = persons[sid];
      if (spouse?.parentCollapsed) {
        const safePersons = buildUnitSafe(unit);
        for (const parentId of spouse.parentIds) {
          floodHideAllConnections(parentId, safePersons);
        }
      }
    }
  }

  // Downward collapse: hidden children's spouses and their entire family trees must also hide.
  // Safe barrier = collapsed parent + child person (prevents flood from looping back).
  for (const unit of units.values()) {
    if (!unit.collapsed) continue;

    const parentSafe = new Set<string>();
    parentSafe.add(unit.personId);
    for (const sid of unit.spouseIds) parentSafe.add(sid);

    for (const childUnitId of unit.childrenUnitIds) {
      const childUnit = units.get(childUnitId);
      if (!childUnit) continue;

      const childPersonId = childUnit.personId;
      const childPerson = persons[childPersonId];
      if (!childPerson) continue;

      const childSafe = new Set(parentSafe);
      childSafe.add(childPersonId);

      const allChildSpouseIds = new Set(childPerson.spouseIds);
      for (const csid of childUnit.spouseIds) allChildSpouseIds.add(csid);

      for (const spouseId of allChildSpouseIds) {
        if (parentSafe.has(spouseId)) continue;
        floodHideAllConnections(spouseId, childSafe);
      }
    }
  }

  const crossTreeLinks: CrossTreeLink[] = [];
  const secondaryRootIds = new Set<string>();
  const crossTreeParentUnits = new Set<string>();

  for (const [unitId, unit] of units) {
    const allPersonChildIds = new Set<string>();
    const primary = persons[unit.personId];
    if (primary) {
      for (const cid of primary.childrenIds) allPersonChildIds.add(cid);
    }
    for (const sid of unit.spouseIds) {
      const spouse = persons[sid];
      if (spouse) {
        for (const cid of spouse.childrenIds) allPersonChildIds.add(cid);
      }
    }

    if (allPersonChildIds.size === 0) continue;

    const ownedChildPersonIds = new Set<string>();
    for (const childUnitId of unit.childrenUnitIds) {
      const childUnit = units.get(childUnitId);
      if (childUnit) {
        ownedChildPersonIds.add(childUnit.personId);
        for (const csid of childUnit.spouseIds) ownedChildPersonIds.add(csid);
      }
    }

    let hasCrossChild = false;
    let minChildGen: number | null = null;
    for (const childId of allPersonChildIds) {
      if (ownedChildPersonIds.has(childId)) continue;
      const childUnitId = personToUnit.get(childId);
      if (childUnitId) {
        const childUnit = units.get(childUnitId);
        if (childUnit) {
          hasCrossChild = true;
          if (minChildGen === null || childUnit.generation < minChildGen) {
            minChildGen = childUnit.generation;
          }
          crossTreeLinks.push({ parentUnitId: unitId, childPersonId: childId });
        }
      }
    }

    if (hasCrossChild) {
      if (!childOwner.has(unitId) && unit.childrenUnitIds.length === 0 && minChildGen !== null) {
        unit.generation = minChildGen - 1;
        secondaryRootIds.add(unitId);
      }
      crossTreeParentUnits.add(unitId);
    }
  }

  for (const person of personList) {
    if (!personToUnit.has(person.id)) {
      const uid = getOrCreateUnit(person.id);
      const u = units.get(uid);
      if (u && !visited.has(uid)) {
        visited.add(uid);
        u.generation = person.generation;
        if (!rootUnitIds.includes(uid)) rootUnitIds.push(uid);
      }
    }
  }

  const childUnitSet = new Set<string>();
  for (const unit of units.values()) {
    for (const cid of unit.childrenUnitIds) {
      childUnitSet.add(cid);
    }
  }
  const trueRootIds = rootUnitIds.filter((rid) => !childUnitSet.has(rid));
  const primaryRoots = trueRootIds.filter((rid) => !secondaryRootIds.has(rid));
  const secondaryRoots = trueRootIds.filter((rid) => secondaryRootIds.has(rid));

  let genOffset = 0;
  for (const unit of units.values()) {
    if (visited.has(unit.id) && unit.generation < genOffset) {
      genOffset = unit.generation;
    }
  }
  if (genOffset < 0) {
    for (const unit of units.values()) {
      if (visited.has(unit.id)) {
        unit.generation -= genOffset;
      }
    }
  }

  const positions = new Map<string, { x: number; y: number }>();

  function collectEffectiveRoots(uid: string, result: string[]) {
    if (hiddenUnits.has(uid)) {
      const u = units.get(uid);
      if (u) {
        for (const childId of u.childrenUnitIds) {
          collectEffectiveRoots(childId, result);
        }
      }
      return;
    }
    result.push(uid);
  }

  function layoutBottomUp(uid: string, leftEdge: number): { center: number; right: number } {
    const u = units.get(uid);
    if (!u) return { center: leftEdge, right: leftEdge + CARD_WIDTH };

    const selfW = unitWidth(u);

    if (u.collapsed || u.childrenUnitIds.length === 0) {
      const x = leftEdge;
      positions.set(uid, { x, y: u.generation * (CARD_HEIGHT + V_GAP) });
      return { center: x + selfW / 2, right: leftEdge + selfW };
    }

    const visibleChildren = u.childrenUnitIds.filter((cid) => !hiddenUnits.has(cid));

    if (visibleChildren.length === 0) {
      const x = leftEdge;
      positions.set(uid, { x, y: u.generation * (CARD_HEIGHT + V_GAP) });
      return { center: x + selfW / 2, right: leftEdge + selfW };
    }

    let cursor = leftEdge;
    const childCenters: number[] = [];
    let maxRight = leftEdge;

    for (let i = 0; i < visibleChildren.length; i++) {
      if (i > 0) cursor += SIBLING_GAP;
      const res = layoutBottomUp(visibleChildren[i], cursor);
      childCenters.push(res.center);
      cursor = res.right;
      maxRight = res.right;
    }

    const firstChildCenter = childCenters[0];
    const lastChildCenter = childCenters[childCenters.length - 1];
    const parentCenter = (firstChildCenter + lastChildCenter) / 2;

    let parentX = parentCenter - selfW / 2;
    if (parentX < leftEdge) {
      const shift = leftEdge - parentX;
      parentX = leftEdge;
      shiftSubtree(visibleChildren, shift);
      maxRight += shift;
    }

    const rightEdge = Math.max(maxRight, parentX + selfW);

    positions.set(uid, { x: parentX, y: u.generation * (CARD_HEIGHT + V_GAP) });

    return { center: parentX + selfW / 2, right: rightEdge };
  }

  function shiftSubtree(unitIds: string[], dx: number) {
    for (const uid of unitIds) {
      const pos = positions.get(uid);
      if (pos) {
        pos.x += dx;
      }
      const u = units.get(uid);
      if (u && !u.collapsed) {
        shiftSubtree(u.childrenUnitIds, dx);
      }
    }
  }

  let cursor = 0;
  const effectiveRoots: string[] = [];
  for (const rootId of primaryRoots) {
    collectEffectiveRoots(rootId, effectiveRoots);
  }

  const rootManualOrder = siblingOrder?.['__roots__'];
  if (rootManualOrder) {
    effectiveRoots.sort((a, b) => {
      const ua = units.get(a);
      const ub = units.get(b);
      const personA = ua?.personId ?? a;
      const personB = ub?.personId ?? b;
      const idxA = rootManualOrder.indexOf(personA);
      const idxB = rootManualOrder.indexOf(personB);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
  }

  for (const rootId of effectiveRoots) {
    const res = layoutBottomUp(rootId, cursor);
    cursor = res.right + SIBLING_GAP * 2;
  }

  const laidOutUnits = new Set<string>();
  for (const [uid] of positions) {
    laidOutUnits.add(uid);
  }

  function countVisibleNodes(uid: string): number {
    if (hiddenUnits.has(uid)) return 0;
    const u = units.get(uid);
    if (!u || !positions.has(uid)) return 0;
    let count = 1 + u.spouseIds.length;
    if (!u.collapsed) {
      for (const cid of u.childrenUnitIds) {
        count += countVisibleNodes(cid);
      }
    }
    return count;
  }

  function getSubtreeXRange(uid: string): { minX: number; maxX: number } | null {
    if (hiddenUnits.has(uid)) return null;
    const pos = positions.get(uid);
    const u = units.get(uid);
    if (!pos || !u) return null;
    const w = unitWidth(u);
    let minX = pos.x;
    let maxX = pos.x + w;
    if (!u.collapsed) {
      for (const cid of u.childrenUnitIds) {
        const childRange = getSubtreeXRange(cid);
        if (childRange) {
          minX = Math.min(minX, childRange.minX);
          maxX = Math.max(maxX, childRange.maxX);
        }
      }
    }
    return { minX, maxX };
  }

  let gravityCenterX = cursor / 2;
  let maxNodeCount = 0;
  for (const rootId of effectiveRoots) {
    const count = countVisibleNodes(rootId);
    if (count > maxNodeCount) {
      maxNodeCount = count;
      const range = getSubtreeXRange(rootId);
      if (range) {
        gravityCenterX = (range.minX + range.maxX) / 2;
      }
    }
  }

  const visibleCrossTreeLinks: CrossTreeLink[] = [];

  interface SecondaryPlacement {
    rootId: string;
    targetX: number;
    selfW: number;
  }
  const placements: SecondaryPlacement[] = [];

  for (const rootId of secondaryRoots) {
    const u = units.get(rootId);
    if (!u) continue;
    if (hiddenUnits.has(rootId)) continue;

    let hasVisibleChild = false;
    let childXSum = 0;
    let childCount = 0;
    for (const link of crossTreeLinks) {
      if (link.parentUnitId !== rootId) continue;
      const childUnitId = personToUnit.get(link.childPersonId);
      if (childUnitId && laidOutUnits.has(childUnitId)) {
        hasVisibleChild = true;
        const childPos = positions.get(childUnitId);
        if (childPos) {
          const childUnit = units.get(childUnitId);
          const childW = childUnit ? unitWidth(childUnit) : CARD_WIDTH;
          childXSum += childPos.x + childW / 2;
          childCount++;
        }
        if (!u.collapsed) {
          visibleCrossTreeLinks.push(link);
        }
      }
    }

    if (hasVisibleChild) {
      const selfW = unitWidth(u);
      const childAvgX = childCount > 0 ? childXSum / childCount : gravityCenterX;
      const targetX = childAvgX < gravityCenterX
        ? childAvgX - selfW - SIBLING_GAP * 2
        : childAvgX + SIBLING_GAP * 2;
      placements.push({ rootId, targetX, selfW });
    }
  }

  placements.sort((a, b) => a.targetX - b.targetX);

  for (const pl of placements) {
    const u = units.get(pl.rootId)!;
    const genY = u.generation * (CARD_HEIGHT + V_GAP);
    let x = pl.targetX;

    const sameRowOccupied: { left: number; right: number }[] = [];
    for (const [uid] of positions) {
      const pu = units.get(uid);
      if (!pu) continue;
      const pos = positions.get(uid)!;
      if (Math.abs(pos.y - genY) < 1) {
        sameRowOccupied.push({ left: pos.x, right: pos.x + unitWidth(pu) });
      }
    }
    sameRowOccupied.sort((a, b) => a.left - b.left);

    let hasOverlap = true;
    let attempts = 0;
    while (hasOverlap && attempts < 50) {
      hasOverlap = false;
      for (const occ of sameRowOccupied) {
        if (x < occ.right + SIBLING_GAP && x + pl.selfW > occ.left - SIBLING_GAP) {
          hasOverlap = true;
          const shiftLeft = occ.left - SIBLING_GAP - pl.selfW;
          const shiftRight = occ.right + SIBLING_GAP;
          if (Math.abs(shiftLeft - pl.targetX) <= Math.abs(shiftRight - pl.targetX)) {
            x = shiftLeft;
          } else {
            x = shiftRight;
          }
          break;
        }
      }
      attempts++;
    }

    positions.set(pl.rootId, { x, y: genY });
  }

  for (const link of crossTreeLinks) {
    if (secondaryRootIds.has(link.parentUnitId)) continue;
    const parentUnit = units.get(link.parentUnitId);
    if (!parentUnit || parentUnit.collapsed) continue;
    if (hiddenUnits.has(link.parentUnitId)) continue;
    if (!laidOutUnits.has(link.parentUnitId)) continue;

    const childUnitId = personToUnit.get(link.childPersonId);
    if (childUnitId && laidOutUnits.has(childUnitId)) {
      visibleCrossTreeLinks.push(link);
    }
  }

  let minGen = Infinity;
  let maxGen = -Infinity;
  for (const unit of units.values()) {
    if (visited.has(unit.id)) {
      minGen = Math.min(minGen, unit.generation);
      maxGen = Math.max(maxGen, unit.generation);
    }
  }
  if (minGen === Infinity) { minGen = 0; maxGen = 0; }

  return { units, positions, personToUnit, rootUnitIds: [...primaryRoots, ...secondaryRoots], effectiveRootIds: effectiveRoots, crossTreeLinks: visibleCrossTreeLinks, crossTreeParentUnits, minGen, maxGen };
}
