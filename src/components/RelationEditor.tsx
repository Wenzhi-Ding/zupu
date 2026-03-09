import React, { useState, useRef, useEffect } from 'react';
import { useFamilyStore } from '../store/familyStore';
import type { Person } from '../types';
import './RelationEditor.css';

interface Props {
  personId: string;
  relationType: 'parent' | 'spouse' | 'child';
  label: string;
  currentIds: string[];
}

export const RelationEditor: React.FC<Props> = ({ personId, relationType, label, currentIds }) => {
  const persons = useFamilyStore((s) => s.persons);
  const removeSpecificRelation = useFamilyStore((s) => s.removeSpecificRelation);
  const addRelationToExisting = useFamilyStore((s) => s.addRelationToExisting);
  const replaceRelation = useFamilyStore((s) => s.replaceRelation);
  const selectPerson = useFamilyStore((s) => s.selectPerson);

  const currentPersons = currentIds.map((id) => persons[id]).filter(Boolean);

  const relTypeToAddRelation: Record<string, 'father' | 'son' | 'husband'> = {
    parent: 'father',
    child: 'son',
    spouse: 'husband',
  };

  return (
    <div className="relation-editor-group">
      <h4>{label}</h4>
      {currentPersons.map((p) => (
        <RelationRow
          key={p.id}
          person={p}
          personId={personId}
          relationType={relationType}
          allPersons={persons}
          onRemove={() => removeSpecificRelation(personId, relationType, p.id)}
          onReplace={(newId) => replaceRelation(personId, relationType, p.id, newId)}
          onNavigate={(id) => selectPerson(id)}
          excludeIds={new Set([personId, ...currentIds])}
        />
      ))}
      <AddRelationRow
        personId={personId}
        relationType={relTypeToAddRelation[relationType]}
        allPersons={persons}
        excludeIds={new Set([personId, ...currentIds])}
        onAdd={(targetId) => addRelationToExisting(personId, relTypeToAddRelation[relationType], targetId)}
      />
    </div>
  );
};

interface RelationRowProps {
  person: Person;
  personId: string;
  relationType: 'parent' | 'spouse' | 'child';
  allPersons: Record<string, Person>;
  onRemove: () => void;
  onReplace: (newId: string) => void;
  onNavigate: (id: string) => void;
  excludeIds: Set<string>;
}

const RelationRow: React.FC<RelationRowProps> = ({
  person,
  allPersons,
  onRemove,
  onReplace,
  onNavigate,
  excludeIds,
}) => {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setEditing(false);
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const candidates = Object.values(allPersons)
    .filter((p) => !excludeIds.has(p.id))
    .filter((p) => query.trim() === '' || p.name.includes(query.trim()));

  const handleSelect = (targetId: string) => {
    onReplace(targetId);
    setEditing(false);
    setShowDropdown(false);
    setQuery('');
  };

  if (editing) {
    return (
      <div className="relation-row editing" ref={dropdownRef}>
        <input
          ref={inputRef}
          className="relation-search-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="输入姓名搜索..."
        />
        <button className="relation-row-btn cancel" onClick={() => { setEditing(false); setQuery(''); }}>
          ✕
        </button>
        {showDropdown && candidates.length > 0 && (
          <div className="search-dropdown">
            {candidates.slice(0, 8).map((c) => (
              <div
                key={c.id}
                className="search-dropdown-item"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(c.id); }}
              >
                <span className="dropdown-name">{c.name}</span>
                <span className="dropdown-info">
                  {c.gender === 'male' ? '♂' : c.gender === 'female' ? '♀' : ''}
                  {c.birthYear ? ` ${c.birthYear}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relation-row">
      <span className="relation-row-name" onClick={() => onNavigate(person.id)}>
        {person.name}
      </span>
      <div className="relation-row-actions">
        <button
          className="relation-row-btn edit"
          onClick={() => { setEditing(true); setQuery(person.name); }}
          title="更换"
        >
          ✎
        </button>
        <button className="relation-row-btn remove" onClick={onRemove} title="移除关系">
          ✕
        </button>
      </div>
    </div>
  );
};

interface AddRelationRowProps {
  personId: string;
  relationType: 'father' | 'son' | 'husband';
  allPersons: Record<string, Person>;
  excludeIds: Set<string>;
  onAdd: (targetId: string) => void;
}

const AddRelationRow: React.FC<AddRelationRowProps> = ({
  allPersons,
  excludeIds,
  onAdd,
}) => {
  const [active, setActive] = useState(false);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active && inputRef.current) {
      inputRef.current.focus();
    }
  }, [active]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActive(false);
        setShowDropdown(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const candidates = Object.values(allPersons)
    .filter((p) => !excludeIds.has(p.id))
    .filter((p) => query.trim() === '' || p.name.includes(query.trim()));

  const handleSelect = (targetId: string) => {
    onAdd(targetId);
    setActive(false);
    setShowDropdown(false);
    setQuery('');
  };

  if (!active) {
    return (
      <div className="relation-add-row" onClick={() => setActive(true)}>
        <span className="relation-add-icon">+</span>
        <span>添加...</span>
      </div>
    );
  }

  return (
    <div className="relation-row editing" ref={containerRef}>
      <input
        ref={inputRef}
        className="relation-search-input"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder="输入姓名搜索..."
      />
      <button className="relation-row-btn cancel" onClick={() => { setActive(false); setQuery(''); }}>
        ✕
      </button>
      {showDropdown && candidates.length > 0 && (
        <div className="search-dropdown">
          {candidates.slice(0, 8).map((c) => (
            <div
              key={c.id}
              className="search-dropdown-item"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(c.id); }}
            >
              <span className="dropdown-name">{c.name}</span>
              <span className="dropdown-info">
                {c.gender === 'male' ? '♂' : c.gender === 'female' ? '♀' : ''}
                {c.birthYear ? ` ${c.birthYear}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
