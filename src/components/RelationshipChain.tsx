import React, { useMemo, useState, useCallback, useEffect } from 'react';
import type { Person } from '../types';
import { buildChain, computeVisibleChain } from '../utils/relationshipChain';
import type { RelationChain, ChainNode, ChainEdge } from '../utils/relationshipChain';
import { useT } from '../i18n';
import './RelationshipChain.css';

interface Props {
  persons: Record<string, Person>;
  path: string[];
}

function renderEdge(edge: ChainEdge) {
  return (
    <span className="chain-edge">
      <span className="chain-edge-label">{edge.label}</span>
      <span className="chain-edge-arrow">→</span>
    </span>
  );
}

function renderNode(node: ChainNode, t: (key: any, params?: Record<string, string | number>) => string, onClick?: () => void) {
  return (
    <span
      className={`chain-node ${node.collapsible ? 'collapsible' : ''}`}
      onClick={onClick}
      title={node.collapsible ? t('clickToToggle') : undefined}
    >
      {node.label}
    </span>
  );
}

export const RelationshipChain: React.FC<Props> = ({ persons, path }) => {
  const t = useT();
  const [collapsedSet, setCollapsedSet] = useState<Set<number>>(new Set());

  useEffect(() => {
    setCollapsedSet(new Set());
  }, [path]);

  const fullChain = useMemo(() => buildChain(persons, path), [persons, path]);

  const chainWithCollapse = useMemo((): RelationChain => {
    if (collapsedSet.size === 0) return fullChain;
    return {
      nodes: fullChain.nodes.map((node, idx) => ({
        ...node,
        collapsed: collapsedSet.has(idx),
      })),
      edges: fullChain.edges,
    };
  }, [fullChain, collapsedSet]);

  const visible = useMemo(
    () => computeVisibleChain(persons, chainWithCollapse),
    [persons, chainWithCollapse],
  );

  const toggleCollapse = useCallback((nodeIdx: number) => {
    const originalIdx = fullChain.nodes.findIndex(
      (n) => n.label === visible.nodes[nodeIdx]?.label &&
        n.personIds.join(',') === visible.nodes[nodeIdx]?.personIds.join(','),
    );
    if (originalIdx === -1) return;
    setCollapsedSet((prev) => {
      const next = new Set(prev);
      if (next.has(originalIdx)) {
        next.delete(originalIdx);
      } else {
        next.add(originalIdx);
      }
      return next;
    });
  }, [fullChain, visible]);

  const hasCollapsible = fullChain.nodes.some((n) => n.collapsible);
  const hasCollapsed = collapsedSet.size > 0;

  const expandAll = useCallback(() => setCollapsedSet(new Set()), []);

  const collapseAll = useCallback(() => {
    const indices = new Set<number>();
    fullChain.nodes.forEach((n, idx) => {
      if (n.collapsible) indices.add(idx);
    });
    setCollapsedSet(indices);
  }, [fullChain]);

  if (visible.nodes.length === 0) return null;

  const elements: React.ReactNode[] = [];

  for (let i = 0; i < visible.nodes.length; i++) {
    const node = visible.nodes[i];
    const edgeBefore = i > 0 ? visible.edges[i - 1] : undefined;
    const hasBranch = !!node.branch;

    if (hasBranch && edgeBefore) {
      const branch = node.branch!;
      const edgeAfter = i < visible.nodes.length - 1 ? visible.edges[i] : undefined;
      elements.push(
        <span key={`branch-${node.personIds.join(',')}`} className="chain-branch-group">
          <span className="chain-branch-row">
            {renderEdge(edgeBefore)}
            {renderNode(node, t, node.collapsible ? () => toggleCollapse(i) : undefined)}
            {edgeAfter && renderEdge(edgeAfter)}
          </span>
          <span className="chain-branch-row">
            {renderEdge({ label: branch.edgeBefore })}
            <span className="chain-node branch-spouse">{branch.label}</span>
            {edgeAfter && renderEdge({ label: branch.edgeAfter })}
          </span>
        </span>,
      );
    } else {
      if (edgeBefore && !visible.nodes[i - 1]?.branch) {
        elements.push(
          <React.Fragment key={`edge-${i}`}>
            {renderEdge(edgeBefore)}
          </React.Fragment>,
        );
      }
      elements.push(
        <React.Fragment key={node.personIds.join(',')}>
          {renderNode(node, t, node.collapsible ? () => toggleCollapse(i) : undefined)}
        </React.Fragment>,
      );
    }
  }

  return (
    <div className="relation-chain">
      <div className="relation-chain-path">
        {elements}
      </div>
      {hasCollapsible && (
        <div className="relation-chain-controls">
          {hasCollapsed && (
            <button className="chain-ctrl-btn" onClick={expandAll}>{t('expandAll')}</button>
          )}
          {!hasCollapsed && fullChain.nodes.filter((n) => n.collapsible).length > 0 && (
            <button className="chain-ctrl-btn" onClick={collapseAll}>{t('collapseMiddle')}</button>
          )}
          {hasCollapsed && collapsedSet.size < fullChain.nodes.filter((n) => n.collapsible).length && (
            <button className="chain-ctrl-btn" onClick={collapseAll}>{t('collapseAll')}</button>
          )}
        </div>
      )}
    </div>
  );
};
