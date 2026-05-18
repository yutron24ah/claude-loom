/**
 * TreeNav — hierarchical tree navigation for CustomizationView.
 *
 * WHY: M0.18 Phase 1 t1 — replaces flat AgentRow list with a recursive tree
 * that renders Agents (3 persistent) + Skills (loom-review strategies + loom-retro
 * lenses/stages) following the design SSoT
 * (docs/design/2026-05-17-m0.18-ui-rework/project/redesign/screens/customization.jsx).
 *
 * Design decisions:
 * - expand/collapse is internal state (each internal node manages its own open state)
 * - selection state is lifted to CustomizationView via onSelect callback (SRP)
 * - WRITE badge is rendered only when writePermission=true (skills.ts marker)
 * - all nodes start expanded for discoverability
 *
 * Tree shape (SSoT spec/ui-arch.md §8.2.2):
 *   ▾ Agents (3)
 *     • loom-pm / loom-developer / loom-retro-pm
 *   ▾ Skills (2)
 *     ▾ loom-review
 *       ▾ strategies/
 *         • single / trio/ > code / security / test
 *     ▾ loom-retro
 *       ▾ lenses/ > pj-axis / process-axis / meta-axis / researcher
 *       ▾ stages/ > counter-arguer / aggregator [WRITE]
 */
import { useState } from 'react';

// Leaf key type — full path e.g. "agents/loom-pm" or "skills/loom-review/strategies/single"
export type LeafKey = string;

export interface TreeNavProps {
  /** Currently selected leaf key */
  selectedKey: LeafKey | null;
  /** Called when a leaf node is clicked */
  onSelect: (key: LeafKey) => void;
}

interface NodeRowProps {
  label: string;
  depth: number;
  hasChildren?: boolean;
  isOpen?: boolean;
  isSelected?: boolean;
  leafKey?: LeafKey;
  writePermission?: boolean;
  count?: number;
  testId?: string;
  onToggle?: () => void;
  onSelect?: (key: LeafKey) => void;
}

function NodeRow({
  label,
  depth,
  hasChildren = false,
  isOpen = false,
  isSelected = false,
  leafKey,
  writePermission = false,
  count,
  testId,
  onToggle,
  onSelect,
}: NodeRowProps): JSX.Element {
  function handleClick(): void {
    if (leafKey && onSelect) {
      onSelect(leafKey);
    } else if (onToggle) {
      onToggle();
    }
  }

  return (
    <div
      data-testid={testId ?? (leafKey ? `tree-leaf-${leafKey}` : undefined)}
      className={`cust-tree__node${isSelected ? ' cust-tree__node--selected' : ''}`}
      style={{ paddingLeft: 6 + depth * 14 }}
      onClick={handleClick}
      role={leafKey ? 'option' : 'button'}
      aria-selected={leafKey ? isSelected : undefined}
    >
      {/* expand/collapse chevron or bullet */}
      {hasChildren ? (
        <span className="cust-tree__chevron">
          {isOpen ? '▾' : '▸'}
        </span>
      ) : (
        <span className="cust-tree__bullet">•</span>
      )}

      {/* label */}
      <span className={`cust-tree__label${hasChildren ? ' cust-tree__label--parent' : ''}`}>
        {label}
      </span>

      {/* count badge for root nodes */}
      {count != null && (
        <span className="cust-tree__count">({count})</span>
      )}

      {/* WRITE badge — only for aggregator */}
      {writePermission && (
        <span data-testid="badge-write" className="cust-badge cust-badge--write">
          WRITE
        </span>
      )}
    </div>
  );
}

export function TreeNav({ selectedKey, onSelect }: TreeNavProps): JSX.Element {
  // WHY: all internal nodes start expanded so the full tree is visible on first render.
  // Users can collapse nodes to reduce visual noise.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    agents: true,
    skills: true,
    'skills/loom-review': true,
    'skills/loom-review/strategies': true,
    'skills/loom-review/strategies/trio': true,
    'skills/loom-retro': true,
    'skills/loom-retro/lenses': true,
    'skills/loom-retro/stages': true,
  });

  function toggle(key: string): void {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="cust-tree" role="listbox" aria-label="Customization tree navigation">
      {/* -------- Agents root -------- */}
      <NodeRow
        testId="tree-root-agents"
        label="Agents"
        depth={0}
        hasChildren
        isOpen={expanded['agents']}
        count={3}
        onToggle={() => toggle('agents')}
        onSelect={onSelect}
      />
      {expanded['agents'] && (
        <>
          <NodeRow
            label="loom-pm"
            depth={1}
            leafKey="agents/loom-pm"
            isSelected={selectedKey === 'agents/loom-pm'}
            onSelect={onSelect}
          />
          <NodeRow
            label="loom-developer"
            depth={1}
            leafKey="agents/loom-developer"
            isSelected={selectedKey === 'agents/loom-developer'}
            onSelect={onSelect}
          />
          <NodeRow
            label="loom-retro-pm"
            depth={1}
            leafKey="agents/loom-retro-pm"
            isSelected={selectedKey === 'agents/loom-retro-pm'}
            onSelect={onSelect}
          />
        </>
      )}

      {/* -------- Skills root -------- */}
      <NodeRow
        testId="tree-root-skills"
        label="Skills"
        depth={0}
        hasChildren
        isOpen={expanded['skills']}
        count={2}
        onToggle={() => toggle('skills')}
        onSelect={onSelect}
      />
      {expanded['skills'] && (
        <>
          {/* loom-review */}
          <NodeRow
            label="loom-review"
            depth={1}
            hasChildren
            isOpen={expanded['skills/loom-review']}
            onToggle={() => toggle('skills/loom-review')}
            onSelect={onSelect}
          />
          {expanded['skills/loom-review'] && (
            <>
              {/* strategies/ */}
              <NodeRow
                label="strategies/"
                depth={2}
                hasChildren
                isOpen={expanded['skills/loom-review/strategies']}
                onToggle={() => toggle('skills/loom-review/strategies')}
                onSelect={onSelect}
              />
              {expanded['skills/loom-review/strategies'] && (
                <>
                  <NodeRow
                    label="single"
                    depth={3}
                    leafKey="skills/loom-review/strategies/single"
                    isSelected={selectedKey === 'skills/loom-review/strategies/single'}
                    onSelect={onSelect}
                  />
                  {/* trio/ */}
                  <NodeRow
                    label="trio/"
                    depth={3}
                    hasChildren
                    isOpen={expanded['skills/loom-review/strategies/trio']}
                    onToggle={() => toggle('skills/loom-review/strategies/trio')}
                    onSelect={onSelect}
                  />
                  {expanded['skills/loom-review/strategies/trio'] && (
                    <>
                      <NodeRow
                        label="code"
                        depth={4}
                        leafKey="skills/loom-review/strategies/trio/code"
                        isSelected={selectedKey === 'skills/loom-review/strategies/trio/code'}
                        onSelect={onSelect}
                      />
                      <NodeRow
                        label="security"
                        depth={4}
                        leafKey="skills/loom-review/strategies/trio/security"
                        isSelected={selectedKey === 'skills/loom-review/strategies/trio/security'}
                        onSelect={onSelect}
                      />
                      <NodeRow
                        label="test"
                        depth={4}
                        leafKey="skills/loom-review/strategies/trio/test"
                        isSelected={selectedKey === 'skills/loom-review/strategies/trio/test'}
                        onSelect={onSelect}
                      />
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* loom-retro */}
          <NodeRow
            label="loom-retro"
            depth={1}
            hasChildren
            isOpen={expanded['skills/loom-retro']}
            onToggle={() => toggle('skills/loom-retro')}
            onSelect={onSelect}
          />
          {expanded['skills/loom-retro'] && (
            <>
              {/* lenses/ */}
              <NodeRow
                label="lenses/"
                depth={2}
                hasChildren
                isOpen={expanded['skills/loom-retro/lenses']}
                onToggle={() => toggle('skills/loom-retro/lenses')}
                onSelect={onSelect}
              />
              {expanded['skills/loom-retro/lenses'] && (
                <>
                  <NodeRow
                    label="pj-axis"
                    depth={3}
                    leafKey="skills/loom-retro/lenses/pj-axis"
                    isSelected={selectedKey === 'skills/loom-retro/lenses/pj-axis'}
                    onSelect={onSelect}
                  />
                  <NodeRow
                    label="process-axis"
                    depth={3}
                    leafKey="skills/loom-retro/lenses/process-axis"
                    isSelected={selectedKey === 'skills/loom-retro/lenses/process-axis'}
                    onSelect={onSelect}
                  />
                  <NodeRow
                    label="meta-axis"
                    depth={3}
                    leafKey="skills/loom-retro/lenses/meta-axis"
                    isSelected={selectedKey === 'skills/loom-retro/lenses/meta-axis'}
                    onSelect={onSelect}
                  />
                  <NodeRow
                    label="researcher"
                    depth={3}
                    leafKey="skills/loom-retro/lenses/researcher"
                    isSelected={selectedKey === 'skills/loom-retro/lenses/researcher'}
                    onSelect={onSelect}
                  />
                </>
              )}

              {/* stages/ */}
              <NodeRow
                label="stages/"
                depth={2}
                hasChildren
                isOpen={expanded['skills/loom-retro/stages']}
                onToggle={() => toggle('skills/loom-retro/stages')}
                onSelect={onSelect}
              />
              {expanded['skills/loom-retro/stages'] && (
                <>
                  <NodeRow
                    label="counter-arguer"
                    depth={3}
                    leafKey="skills/loom-retro/stages/counter-arguer"
                    isSelected={selectedKey === 'skills/loom-retro/stages/counter-arguer'}
                    onSelect={onSelect}
                  />
                  <NodeRow
                    label="aggregator"
                    depth={3}
                    leafKey="skills/loom-retro/stages/aggregator"
                    isSelected={selectedKey === 'skills/loom-retro/stages/aggregator'}
                    writePermission={true}
                    onSelect={onSelect}
                  />
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Legend */}
      <div className="cust-tree__legend">
        ◆ Agent = 常駐 (model + personality + learned_guidance)<br />
        ◆ Skill = 召喚 template (scope ごとに personality)<br />
        ◆ <span className="cust-badge cust-badge--write">WRITE</span> = 書き込み権限あり
      </div>
    </div>
  );
}
