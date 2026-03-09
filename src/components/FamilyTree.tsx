import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useFamilyStore } from '../store/familyStore';
import { computeLayout, computeUnitPersonOrder, getLayoutConstants } from '../layout/engine';

import { PersonCard } from './PersonCard';
import { AddPersonDialog } from './AddPersonDialog';
import { RelationshipChain } from './RelationshipChain';
import './FamilyTree.css';

interface DragState {
  personId: string;
  parentUnitId: string;
  startClientX: number;
  startClientY: number;
  startSvgX: number;
  startSvgY: number;
  currentSvgX: number;
  currentSvgY: number;
  isDragging: boolean;
  mode: 'undecided' | 'sibling-reorder' | 'generation-drag';
  startGeneration: number;
}

interface PinchState {
  initialDistance: number;
  initialZoom: number;
  initialPanX: number;
  initialPanY: number;
  centerX: number;
  centerY: number;
}

export const FamilyTree: React.FC = () => {
  const persons = useFamilyStore((s) => s.persons);
  const siblingOrder = useFamilyStore((s) => s.siblingOrder);
  const spouseOrder = useFamilyStore((s) => s.spouseOrder);
  const setSiblingOrder = useFamilyStore((s) => s.setSiblingOrder);
  const setGeneration = useFamilyStore((s) => s.setGeneration);
  const anchorPersonId = useFamilyStore((s) => s.anchorPersonId);
  const selectedPersonId = useFamilyStore((s) => s.selectedPersonId);
  const _hydrated = useFamilyStore((s) => s._hydrated);
  const relationMode = useFamilyStore((s) => s.relationMode);
  const relationPath = useFamilyStore((s) => s.relationPath);
  const relationPickedIds = useFamilyStore((s) => s.relationPickedIds);
  const [addingForPersonId, setAddingForPersonId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  panRef.current = pan;
  zoomRef.current = zoom;
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const dragRef = useRef<DragState | null>(null);
  const [dragRender, setDragRender] = useState<DragState | null>(null);
  const pinchRef = useRef<PinchState | null>(null);
  const touchPanStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const isTouchPanning = useRef(false);

  const prevPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const skipAnchorRef = useRef(false);
  const initialCenterDone = useRef(false);

  const layout = useMemo(() => computeLayout(persons, siblingOrder), [persons, siblingOrder]);
  const { CARD_WIDTH, CARD_HEIGHT, COUPLE_GAP, V_GAP } = getLayoutConstants();

  const pathSet = useMemo(() => new Set(relationPath ?? []), [relationPath]);
  const pathEndSet = useMemo(() => {
    if (relationPickedIds.length === 2) return new Set(relationPickedIds);
    if (relationPickedIds.length === 1) return new Set(relationPickedIds);
    return new Set<string>();
  }, [relationPickedIds]);

  useEffect(() => {
    if (!anchorPersonId || skipAnchorRef.current) {
      skipAnchorRef.current = false;
      prevPositionsRef.current = new Map(layout.positions);
      if (anchorPersonId) useFamilyStore.setState({ anchorPersonId: null });
      return;
    }

    const unitId = layout.personToUnit.get(anchorPersonId);
    const newPos = unitId ? layout.positions.get(unitId) : undefined;
    const oldPos = unitId ? prevPositionsRef.current.get(unitId) : undefined;

    if (newPos && oldPos) {
      const dx = (oldPos.x - newPos.x) * zoom;
      const dy = (oldPos.y - newPos.y) * zoom;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      }
    }

    prevPositionsRef.current = new Map(layout.positions);
    useFamilyStore.setState({ anchorPersonId: null });
  }, [layout, anchorPersonId, zoom]);

  // Center viewport on selected person on initial load
  useEffect(() => {
    if (initialCenterDone.current || !_hydrated) return;
    if (layout.positions.size === 0) return;

    const svg = svgRef.current;
    if (!svg) return;

    const targetId = selectedPersonId;
    const unitId = targetId ? layout.personToUnit.get(targetId) : undefined;
    const pos = unitId ? layout.positions.get(unitId) : undefined;

    const rect = svg.getBoundingClientRect();
    const vw = rect.width;
    const vh = rect.height;

    if (pos) {
      const cardCenterX = pos.x + CARD_WIDTH / 2;
      const cardCenterY = pos.y + CARD_HEIGHT / 2;
      setPan({
        x: vw / 2 - cardCenterX * zoom,
        y: vh / 2 - cardCenterY * zoom,
      });
    } else {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of layout.positions.values()) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      const treeCenterX = (minX + maxX + CARD_WIDTH) / 2;
      const treeCenterY = (minY + maxY + CARD_HEIGHT) / 2;
      setPan({
        x: vw / 2 - treeCenterX * zoom,
        y: vh / 2 - treeCenterY * zoom,
      });
    }

    initialCenterDone.current = true;
  }, [_hydrated, layout, selectedPersonId, zoom, CARD_WIDTH, CARD_HEIGHT]);

  const clientToSvg = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  const ROOTS_KEY = '__roots__';

  const isEffectiveRoot = useCallback(
    (personId: string): boolean => {
      const unitId = layout.personToUnit.get(personId);
      if (!unitId) return false;
      return layout.effectiveRootIds.includes(unitId);
    },
    [layout]
  );

  const findParentUnit = useCallback(
    (personId: string): string | null => {
      for (const [unitId, unit] of layout.units) {
        for (const childUnitId of unit.childrenUnitIds) {
          const childUnit = layout.units.get(childUnitId);
          if (childUnit && (childUnit.personId === personId || childUnit.spouseIds.includes(personId))) {
            return unitId;
          }
        }
      }
      if (isEffectiveRoot(personId) && layout.effectiveRootIds.length >= 2) {
        return ROOTS_KEY;
      }
      return null;
    },
    [layout, isEffectiveRoot, ROOTS_KEY]
  );

  const getSiblingPersonIds = useCallback(
    (parentUnitId: string, draggedPersonId: string): string[] => {
      if (parentUnitId === ROOTS_KEY) {
        return layout.effectiveRootIds.map((uid) => {
          const u = layout.units.get(uid);
          return u?.personId ?? uid;
        });
      }
      const parentUnit = layout.units.get(parentUnitId);
      if (!parentUnit) return [];
      const ids: string[] = [];
      for (const childUnitId of parentUnit.childrenUnitIds) {
        const childUnit = layout.units.get(childUnitId);
        if (childUnit) {
          if (childUnit.personId === draggedPersonId || childUnit.spouseIds.includes(draggedPersonId)) {
            ids.push(draggedPersonId);
          } else {
            ids.push(childUnit.personId);
          }
        }
      }
      return ids;
    },
    [layout, ROOTS_KEY]
  );

  const handleCardDragStart = useCallback(
    (personId: string, clientX: number, clientY: number) => {
      const parentUnitId = findParentUnit(personId);
      const person = persons[personId];

      const svgPos = clientToSvg(clientX, clientY);
      const unitId = layout.personToUnit.get(personId);
      const pos = unitId ? layout.positions.get(unitId) : undefined;

      const state: DragState = {
        personId,
        parentUnitId: parentUnitId ?? '',
        startClientX: clientX,
        startClientY: clientY,
        startSvgX: pos?.x ?? svgPos.x,
        startSvgY: pos?.y ?? svgPos.y,
        currentSvgX: pos?.x ?? svgPos.x,
        currentSvgY: pos?.y ?? svgPos.y,
        isDragging: false,
        mode: 'undecided',
        startGeneration: person?.generation ?? 1,
      };
      dragRef.current = state;
    },
    [findParentUnit, clientToSvg, layout, persons]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const prevZoom = zoomRef.current;
    const prevPan = panRef.current;
    const newZoom = Math.min(3, Math.max(0.2, prevZoom * delta));
    const scale = newZoom / prevZoom;
    setZoom(newZoom);
    setPan({
      x: cx - (cx - prevPan.x) * scale,
      y: cy - (cy - prevPan.y) * scale,
    });
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (dragRef.current) return;
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startClientX;
        const dy = e.clientY - dragRef.current.startClientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (!dragRef.current.isDragging && dist > 5) {
          dragRef.current.isDragging = true;
          if (Math.abs(dy) > Math.abs(dx)) {
            dragRef.current.mode = 'generation-drag';
          } else {
            const parentUnitId = dragRef.current.parentUnitId;
            const canReorder = parentUnitId && (
              parentUnitId === ROOTS_KEY ||
              (layout.units.get(parentUnitId)?.childrenUnitIds.length ?? 0) >= 2
            );
            dragRef.current.mode = canReorder ? 'sibling-reorder' : 'generation-drag';
          }
        }
        if (dragRef.current.isDragging) {
          const svgPos = clientToSvg(e.clientX, e.clientY);
          dragRef.current.currentSvgX = svgPos.x - CARD_WIDTH / 2;
          dragRef.current.currentSvgY = svgPos.y - CARD_HEIGHT / 2;
          setDragRender({ ...dragRef.current });
        }
        return;
      }
      if (!isPanning) return;
      setPan({
        x: panStart.current.panX + (e.clientX - panStart.current.x),
        y: panStart.current.panY + (e.clientY - panStart.current.y),
      });
    },
    [isPanning, clientToSvg, CARD_WIDTH, CARD_HEIGHT, ROOTS_KEY, layout]
  );

  const commitDragOrder = useCallback(
    (drag: DragState) => {
      const siblingIds = getSiblingPersonIds(drag.parentUnitId, drag.personId);
      const draggedX = drag.currentSvgX;

      const siblingXPositions: { personId: string; x: number }[] = [];
      for (const sid of siblingIds) {
        if (sid === drag.personId) {
          siblingXPositions.push({ personId: sid, x: draggedX });
        } else {
          const unitId = layout.personToUnit.get(sid);
          const pos = unitId ? layout.positions.get(unitId) : undefined;
          if (pos) {
            siblingXPositions.push({ personId: sid, x: pos.x });
          }
        }
      }

      siblingXPositions.sort((a, b) => a.x - b.x);
      const newOrder = siblingXPositions.map((s) => s.personId);

      skipAnchorRef.current = true;
      if (drag.parentUnitId === ROOTS_KEY) {
        setSiblingOrder(ROOTS_KEY, newOrder);
      } else {
        const parentUnit = layout.units.get(drag.parentUnitId);
        if (parentUnit) {
          setSiblingOrder(parentUnit.personId, newOrder);
        }
      }
    },
    [layout, getSiblingPersonIds, setSiblingOrder, ROOTS_KEY]
  );

  const commitGenerationDrag = useCallback(
    (drag: DragState) => {
      const rowHeight = CARD_HEIGHT + V_GAP;
      const draggedCenterY = drag.currentSvgY + CARD_HEIGHT / 2;
      const newGen = Math.round(draggedCenterY / rowHeight);
      if (newGen !== drag.startGeneration) {
        skipAnchorRef.current = true;
        setGeneration(drag.personId, newGen);
      }
    },
    [CARD_HEIGHT, V_GAP, setGeneration]
  );

  const handleMouseUp = useCallback(() => {
    if (dragRef.current?.isDragging) {
      if (dragRef.current.mode === 'generation-drag') {
        commitGenerationDrag(dragRef.current);
      } else if (dragRef.current.mode === 'sibling-reorder') {
        commitDragOrder(dragRef.current);
      }
      dragRef.current = null;
      setDragRender(null);
      return;
    }
    dragRef.current = null;
    setDragRender(null);
    setIsPanning(false);
  }, [commitDragOrder, commitGenerationDrag]);

  const getTouchDistance = useCallback((t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        dragRef.current = null;
        isTouchPanning.current = false;
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        pinchRef.current = {
          initialDistance: dist,
          initialZoom: zoomRef.current,
          initialPanX: panRef.current.x,
          initialPanY: panRef.current.y,
          centerX: cx,
          centerY: cy,
        };
        return;
      }

      if (e.touches.length === 1 && !dragRef.current) {
        isTouchPanning.current = true;
        touchPanStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          panX: panRef.current.x,
          panY: panRef.current.y,
        };
      }
    },
    [getTouchDistance]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const scale = dist / pinchRef.current.initialDistance;
        const newZoom = Math.min(3, Math.max(0.2, pinchRef.current.initialZoom * scale));
        const zoomRatio = newZoom / pinchRef.current.initialZoom;
        const cx = pinchRef.current.centerX;
        const cy = pinchRef.current.centerY;
        const iPanX = pinchRef.current.initialPanX;
        const iPanY = pinchRef.current.initialPanY;

        setZoom(newZoom);
        setPan({
          x: cx - (cx - iPanX) * zoomRatio,
          y: cy - (cy - iPanY) * zoomRatio,
        });
        return;
      }

      if (dragRef.current && e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = touch.clientX - dragRef.current.startClientX;
        const dy = touch.clientY - dragRef.current.startClientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (!dragRef.current.isDragging && dist > 10) {
          dragRef.current.isDragging = true;
          isTouchPanning.current = false;
          if (Math.abs(dy) > Math.abs(dx)) {
            dragRef.current.mode = 'generation-drag';
          } else {
            const parentUnitId = dragRef.current.parentUnitId;
            const canReorder = parentUnitId && (
              parentUnitId === ROOTS_KEY ||
              (layout.units.get(parentUnitId)?.childrenUnitIds.length ?? 0) >= 2
            );
            dragRef.current.mode = canReorder ? 'sibling-reorder' : 'generation-drag';
          }
        }
        if (dragRef.current.isDragging) {
          const svgPos = clientToSvg(touch.clientX, touch.clientY);
          dragRef.current.currentSvgX = svgPos.x - CARD_WIDTH / 2;
          dragRef.current.currentSvgY = svgPos.y - CARD_HEIGHT / 2;
          setDragRender({ ...dragRef.current });
        }
        return;
      }

      if (isTouchPanning.current && e.touches.length === 1) {
        const touch = e.touches[0];
        setPan({
          x: touchPanStart.current.panX + (touch.clientX - touchPanStart.current.x),
          y: touchPanStart.current.panY + (touch.clientY - touchPanStart.current.y),
        });
      }
    },
    [getTouchDistance, clientToSvg, CARD_WIDTH, CARD_HEIGHT, ROOTS_KEY, layout]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length < 2) {
        pinchRef.current = null;
      }
      if (e.touches.length === 0) {
        if (dragRef.current?.isDragging) {
          if (dragRef.current.mode === 'generation-drag') {
            commitGenerationDrag(dragRef.current);
          } else if (dragRef.current.mode === 'sibling-reorder') {
            commitDragOrder(dragRef.current);
          }
        }
        dragRef.current = null;
        setDragRender(null);
        isTouchPanning.current = false;
      }
    },
    [commitDragOrder, commitGenerationDrag]
  );

  useEffect(() => {
    const handler = () => {
      if (dragRef.current?.isDragging) {
        if (dragRef.current.mode === 'generation-drag') {
          commitGenerationDrag(dragRef.current);
        } else if (dragRef.current.mode === 'sibling-reorder') {
          commitDragOrder(dragRef.current);
        }
      }
      dragRef.current = null;
      setDragRender(null);
      setIsPanning(false);
    };
    window.addEventListener('mouseup', handler);
    return () => window.removeEventListener('mouseup', handler);
  }, [commitDragOrder, commitGenerationDrag]);

  const connectors: React.ReactNode[] = [];

  layout.units.forEach((unit) => {
    const pos = layout.positions.get(unit.id);
    if (!pos) return;

    if (unit.spouseIds.length > 0) {
      const orderedIds = computeUnitPersonOrder(unit.personId, unit.spouseIds, persons, spouseOrder);
      for (let i = 0; i < orderedIds.length - 1; i++) {
        const x1 = pos.x + (i + 1) * CARD_WIDTH + i * COUPLE_GAP;
        const y1 = pos.y + CARD_HEIGHT / 2;
        const x2 = x1 + COUPLE_GAP;
        const y2 = y1;
        connectors.push(
          <line
            key={`couple-${unit.id}-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            className="connector-couple"
          />
        );
      }
    }

    if (!unit.collapsed && unit.childrenUnitIds.length > 0) {
      const uw = unitWidthFromUnit(unit);
      const parentCenterX = pos.x + uw / 2;
      const parentBottomY = pos.y + CARD_HEIGHT;
      const midY = parentBottomY + (V_GAP + 20) / 2;

      const parentPerson = persons[unit.personId];
      const parentChildrenSet = new Set<string>();
      if (parentPerson) for (const cid of parentPerson.childrenIds) parentChildrenSet.add(cid);
      for (const sid of unit.spouseIds) {
        const sp = persons[sid];
        if (sp) for (const cid of sp.childrenIds) parentChildrenSet.add(cid);
      }

      const childXPositions: number[] = [];
      const childLines: React.ReactNode[] = [];
      for (const childUnitId of unit.childrenUnitIds) {
        const childPos = layout.positions.get(childUnitId);
        const childUnit = layout.units.get(childUnitId);
        if (!childPos || !childUnit) continue;

        const orderedChildIds = computeUnitPersonOrder(childUnit.personId, childUnit.spouseIds, persons, spouseOrder);
        const matchingChildPersonIds = orderedChildIds.filter((pid) => parentChildrenSet.has(pid));
        if (matchingChildPersonIds.length === 0) {
          matchingChildPersonIds.push(childUnit.personId);
        }

        for (const childPersonId of matchingChildPersonIds) {
          const childIdx = Math.max(0, orderedChildIds.indexOf(childPersonId));
          const childCenterX = childPos.x + childIdx * (CARD_WIDTH + COUPLE_GAP) + CARD_WIDTH / 2;
          childXPositions.push(childCenterX);

          childLines.push(
            <line
              key={`child-up-${childUnitId}-${childPersonId}`}
              x1={childCenterX}
              y1={midY}
              x2={childCenterX}
              y2={childPos.y}
              className="connector-line"
            />
          );
        }
      }

      if (childXPositions.length > 0) {
        connectors.push(
          <line
            key={`parent-down-${unit.id}`}
            x1={parentCenterX}
            y1={parentBottomY}
            x2={parentCenterX}
            y2={midY}
            className="connector-line"
          />
        );

        connectors.push(...childLines);

        {
          const allX = [parentCenterX, ...childXPositions];
          const minX = Math.min(...allX);
          const maxX = Math.max(...allX);
          if (minX !== maxX) {
            connectors.push(
              <line
                key={`hline-${unit.id}`}
                x1={minX}
                y1={midY}
                x2={maxX}
                y2={midY}
                className="connector-line"
              />
            );
          }
        }
      }
    }
  });

  for (const link of layout.crossTreeLinks) {
    const parentPos = layout.positions.get(link.parentUnitId);
    const parentUnit = layout.units.get(link.parentUnitId);
    if (!parentPos || !parentUnit) continue;

    const childUnitId = layout.personToUnit.get(link.childPersonId);
    if (!childUnitId) continue;
    const childPos = layout.positions.get(childUnitId);
    const childUnit = layout.units.get(childUnitId);
    if (!childPos || !childUnit) continue;

    const parentW = unitWidthFromUnit(parentUnit);
    const parentBottomX = parentPos.x + parentW / 2;
    const parentBottomY = parentPos.y + CARD_HEIGHT;

    const childPerson = persons[link.childPersonId];
    let childTopX: number;
    if (childPerson) {
      const orderedIds = computeUnitPersonOrder(childUnit.personId, childUnit.spouseIds, persons, spouseOrder);
      const idx = Math.max(0, orderedIds.indexOf(link.childPersonId));
      childTopX = childPos.x + idx * (CARD_WIDTH + COUPLE_GAP) + CARD_WIDTH / 2;
    } else {
      childTopX = childPos.x + CARD_WIDTH / 2;
    }
    const childTopY = childPos.y;

    const bendY = parentBottomY + 15;

    connectors.push(
      <polyline
        key={`cross-${link.parentUnitId}-${link.childPersonId}`}
        points={`${parentBottomX},${parentBottomY} ${parentBottomX},${bendY} ${childTopX},${bendY} ${childTopX},${childTopY}`}
        className="connector-cross"
      />
    );
  }

  function unitWidthFromUnit(unit: { spouseIds: string[] }) {
    const personCount = 1 + unit.spouseIds.length;
    return CARD_WIDTH * personCount + COUPLE_GAP * (personCount - 1);
  }

  const cards: React.ReactNode[] = [];

  layout.units.forEach((unit) => {
    const pos = layout.positions.get(unit.id);
    if (!pos) return;

    const primary = persons[unit.personId];
    if (!primary) return;

    const primaryHasChildren = unit.childrenUnitIds.length > 0 || layout.crossTreeParentUnits.has(unit.id);

    const showPath = relationMode && relationPath;

    const orderedIds = computeUnitPersonOrder(unit.personId, unit.spouseIds, persons, spouseOrder);

    orderedIds.forEach((pid, idx) => {
      const person = persons[pid];
      if (!person) return;
      const px = pos.x + idx * (CARD_WIDTH + COUPLE_GAP);
      const py = pos.y;
      const personHasParents = person.parentIds.length > 0;
      cards.push(
        <PersonCard
          key={person.id}
          person={person}
          x={px}
          y={py}
          isSpouse={pid !== unit.personId}
          hasChildren={primaryHasChildren}
          isCollapsed={unit.collapsed}
          hasParents={personHasParents}
          isParentCollapsed={!!person.parentCollapsed}
          onAddRelation={(id) => setAddingForPersonId(id)}
          onDragStart={handleCardDragStart}
          isDragSource={dragRender?.personId === person.id}
          relationMode={relationMode}
          hasPath={!!showPath}
          isOnPath={showPath ? pathSet.has(person.id) : false}
          isPathEnd={pathEndSet.has(person.id)}
        />
      );
    });
  });

  return (
    <div className="family-tree-container">
      <svg
        ref={svgRef}
        className={`family-tree-svg ${dragRender?.isDragging ? 'is-dragging' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {connectors}
          {relationPath && relationPath.length >= 2 && (() => {
            const highlightLines: React.ReactNode[] = [];
            for (let i = 0; i < relationPath.length - 1; i++) {
              const aId = relationPath[i];
              const bId = relationPath[i + 1];
              const aUnit = layout.personToUnit.get(aId);
              const bUnit = layout.personToUnit.get(bId);
              if (!aUnit || !bUnit) continue;
              const aPos = layout.positions.get(aUnit);
              const bPos = layout.positions.get(bUnit);
              if (!aPos || !bPos) continue;
              const aUnitData = layout.units.get(aUnit);
              const bUnitData = layout.units.get(bUnit);
              const aIdx = aUnitData
                ? computeUnitPersonOrder(aUnitData.personId, aUnitData.spouseIds, persons, spouseOrder).indexOf(aId)
                : 0;
              const bIdx = bUnitData
                ? computeUnitPersonOrder(bUnitData.personId, bUnitData.spouseIds, persons, spouseOrder).indexOf(bId)
                : 0;
              const ax = aPos.x + Math.max(0, aIdx) * (CARD_WIDTH + COUPLE_GAP) + CARD_WIDTH / 2;
              const ay = aPos.y + CARD_HEIGHT / 2;
              const bx = bPos.x + Math.max(0, bIdx) * (CARD_WIDTH + COUPLE_GAP) + CARD_WIDTH / 2;
              const by = bPos.y + CARD_HEIGHT / 2;
              highlightLines.push(
                <line
                  key={`path-hl-${i}`}
                  x1={ax} y1={ay} x2={bx} y2={by}
                  className="connector-path-highlight"
                />
              );
            }
            return highlightLines;
          })()}
          {cards}
          {dragRender?.isDragging && dragRender.mode === 'generation-drag' && (() => {
            const rowHeight = CARD_HEIGHT + V_GAP;
            const draggedCenterY = dragRender.currentSvgY + CARD_HEIGHT / 2;
            const targetGen = Math.round(draggedCenterY / rowHeight);
            const targetY = targetGen * rowHeight;

            let minX = -200;
            let maxX = 1000;
            for (const pos of layout.positions.values()) {
              minX = Math.min(minX, pos.x - 50);
              maxX = Math.max(maxX, pos.x + CARD_WIDTH + 50);
            }

            return (
              <g className="generation-guide">
                <rect
                  x={minX}
                  y={targetY - 5}
                  width={maxX - minX}
                  height={CARD_HEIGHT + 10}
                  rx={4}
                />
                <text
                  x={minX + 8}
                  y={targetY + CARD_HEIGHT / 2 + 4}
                  className="generation-guide-label"
                >
                  第 {targetGen} 代
                </text>
              </g>
            );
          })()}
          {dragRender?.isDragging && (() => {
            const dragPerson = persons[dragRender.personId];
            if (!dragPerson) return null;
            const genderClass = dragPerson.gender === 'male' ? 'male' : dragPerson.gender === 'female' ? 'female' : '';
            return (
              <g className={`person-card ${genderClass} drag-ghost`} transform={`translate(${dragRender.currentSvgX}, ${dragRender.currentSvgY})`}>
                <rect width={CARD_WIDTH} height={CARD_HEIGHT} rx={8} ry={8} className="card-bg" />
                {[...dragPerson.name].map((char, i) => (
                  <text key={i} x={CARD_WIDTH / 2} y={16 + i * 17} textAnchor="middle" className="card-name">{char}</text>
                ))}
              </g>
            );
          })()}
        </g>
      </svg>

      <div className="zoom-controls">
        <button onClick={() => {
          const svg = svgRef.current;
          if (!svg) return;
          const rect = svg.getBoundingClientRect();
          const cx = rect.width / 2;
          const cy = rect.height / 2;
          const prev = zoomRef.current;
          const next = Math.min(3, prev * 1.2);
          const scale = next / prev;
          const p = panRef.current;
          setZoom(next);
          setPan({ x: cx - (cx - p.x) * scale, y: cy - (cy - p.y) * scale });
        }}>+</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => {
          const svg = svgRef.current;
          if (!svg) return;
          const rect = svg.getBoundingClientRect();
          const cx = rect.width / 2;
          const cy = rect.height / 2;
          const prev = zoomRef.current;
          const next = Math.max(0.2, prev * 0.8);
          const scale = next / prev;
          const p = panRef.current;
          setZoom(next);
          setPan({ x: cx - (cx - p.x) * scale, y: cy - (cy - p.y) * scale });
        }}>-</button>
        <button
          onClick={() => {
            const svg = svgRef.current;
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const vw = rect.width;
            const vh = rect.height;

            const targetId = selectedPersonId;
            const unitId = targetId ? layout.personToUnit.get(targetId) : undefined;
            const pos = unitId ? layout.positions.get(unitId) : undefined;

            setZoom(1);
            if (pos) {
              const cx = pos.x + CARD_WIDTH / 2;
              const cy = pos.y + CARD_HEIGHT / 2;
              setPan({ x: vw / 2 - cx, y: vh / 2 - cy });
            } else {
              let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
              for (const p of layout.positions.values()) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
              }
              const cx = (minX + maxX + CARD_WIDTH) / 2;
              const cy = (minY + maxY + CARD_HEIGHT) / 2;
              setPan({ x: vw / 2 - cx, y: vh / 2 - cy });
            }
          }}
        >
          ↺
        </button>
      </div>

      {addingForPersonId && (
        <AddPersonDialog
          targetPersonId={addingForPersonId}
          onClose={() => setAddingForPersonId(null)}
        />
      )}

      {relationPath && relationPath.length >= 2 && (
        <RelationshipChain persons={persons} path={relationPath} />
      )}
    </div>
  );
};
