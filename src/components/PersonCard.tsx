import React from 'react';
import type { Person } from '../types';
import { useFamilyStore } from '../store/familyStore';
import { getLayoutConstants } from '../layout/engine';
import './PersonCard.css';

interface Props {
  person: Person;
  x: number;
  y: number;
  isSpouse?: boolean;
  hasChildren: boolean;
  isCollapsed: boolean;
  hasParents: boolean;
  isParentCollapsed: boolean;
  onAddRelation: (personId: string) => void;
  onDragStart?: (personId: string, clientX: number, clientY: number) => void;
  isDragSource?: boolean;
  relationMode?: boolean;
  hasPath?: boolean;
  isOnPath?: boolean;
  isPathEnd?: boolean;
}

export const PersonCard: React.FC<Props> = ({
  person,
  x,
  y,
  hasChildren,
  isCollapsed,
  hasParents,
  isParentCollapsed,
  onAddRelation,
  onDragStart,
  isDragSource,
  relationMode,
  hasPath,
  isOnPath,
  isPathEnd,
}) => {
  const { CARD_WIDTH, CARD_HEIGHT } = getLayoutConstants();
  const selectPerson = useFamilyStore((s) => s.selectPerson);
  const selectedId = useFamilyStore((s) => s.selectedPersonId);
  const toggleCollapse = useFamilyStore((s) => s.toggleCollapse);
  const toggleParentCollapse = useFamilyStore((s) => s.toggleParentCollapse);
  const pickRelationNode = useFamilyStore((s) => s.pickRelationNode);

  const isSelected = selectedId === person.id;
  const genderClass = person.gender === 'male' ? 'male' : person.gender === 'female' ? 'female' : '';
  const deceasedClass = person.deathYear ? 'deceased' : '';
  const pathClass = isOnPath ? (isPathEnd ? 'path-end' : 'on-path') : (isPathEnd ? 'path-end' : '');
  const dimClass = hasPath && !isOnPath && !isPathEnd ? 'relation-dim' : '';

  const nameChars = [...person.name];
  const genderSymbol = person.gender === 'male' ? '♂' : person.gender === 'female' ? '♀' : '';

  const nameStartY = 16;
  const lineHeight = 17;
  const titleText = person.title ? `(${person.title})` : '';
  const titleY = nameStartY + nameChars.length * lineHeight + 2;
  const genderY = titleY + (titleText ? 14 : 0);

  const birthDeathText =
    person.birthYear || person.deathYear
      ? `${person.birthYear ?? '?'}-${person.deathYear ?? ''}`
      : '';
  const birthDeathY = genderY + 14;

  return (
    <g
      className={`person-card ${genderClass} ${deceasedClass} ${isSelected ? 'selected' : ''} ${isDragSource ? 'drag-source' : ''} ${pathClass} ${dimClass}`}
      transform={`translate(${x}, ${y})`}
    >
      <rect
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        rx={8}
        ry={8}
        className="card-bg"
        onClick={() => {
          if (relationMode) {
            pickRelationNode(person.id);
          } else {
            selectPerson(person.id);
          }
        }}
        onMouseDown={(e) => {
          if (relationMode) return;
          if (e.button !== 0 || !onDragStart) return;
          e.stopPropagation();
          onDragStart(person.id, e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          if (relationMode) return;
          if (!onDragStart) return;
          if (e.touches.length !== 1) return;
          e.stopPropagation();
          const touch = e.touches[0];
          onDragStart(person.id, touch.clientX, touch.clientY);
        }}
      />

      {nameChars.map((char, i) => (
        <text
          key={i}
          x={CARD_WIDTH / 2}
          y={nameStartY + i * lineHeight}
          textAnchor="middle"
          className="card-name"
        >
          {char}
        </text>
      ))}

      {titleText && (
        <text x={CARD_WIDTH / 2} y={titleY} textAnchor="middle" className="card-title">
          {titleText}
        </text>
      )}

      <text x={CARD_WIDTH / 2} y={genderY} textAnchor="middle" className="card-info">
        {genderSymbol}
      </text>

      {birthDeathText && (
        <text x={CARD_WIDTH / 2} y={birthDeathY} textAnchor="middle" className="card-year">
          {birthDeathText}
        </text>
      )}

      {!relationMode && (
        <g
          className="card-add-btn"
          onClick={(e) => {
            e.stopPropagation();
            onAddRelation(person.id);
          }}
        >
          <circle cx={CARD_WIDTH - 10} cy={10} r={8} />
          <text x={CARD_WIDTH - 10} y={14} textAnchor="middle" fontSize={12} fontWeight="bold">
            +
          </text>
        </g>
      )}

      {hasChildren && (
        <g
          className="card-collapse-btn"
          onClick={(e) => {
            e.stopPropagation();
            toggleCollapse(person.id);
          }}
        >
          <circle cx={CARD_WIDTH / 2} cy={CARD_HEIGHT + 10} r={8} />
          <text x={CARD_WIDTH / 2} y={CARD_HEIGHT + 14} textAnchor="middle" fontSize={10}>
            {isCollapsed ? '▶' : '▼'}
          </text>
        </g>
      )}

      {hasParents && (
        <g
          className="card-collapse-btn"
          onClick={(e) => {
            e.stopPropagation();
            toggleParentCollapse(person.id);
          }}
        >
          <circle cx={CARD_WIDTH / 2} cy={-10} r={8} />
          <text x={CARD_WIDTH / 2} y={-6} textAnchor="middle" fontSize={10}>
            {isParentCollapsed ? '▶' : '▲'}
          </text>
        </g>
      )}
    </g>
  );
};
