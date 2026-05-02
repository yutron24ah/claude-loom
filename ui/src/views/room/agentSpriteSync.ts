/**
 * agentSpriteSync — bridge from agent state to Phaser sprite state.
 *
 * WHY (SPEC §3.6.9.1 bridge design):
 * - Single direction: agent state → Phaser sprite state (not bidirectional)
 * - The function is pure: given a scene + agents list, it ensures the
 *   scene's spriteMap reflects the current agent list
 * - State changes (idle/busy/fail) are applied by calling scene.setAgentState()
 * - Agent additions: new Graphics object added to spriteMap
 * - Agent removals: Graphics.destroy() called, entry removed from spriteMap
 *
 * Position layout mirrors RoomView.tsx island layout (scaled to Phaser canvas).
 */
import type { RoomScene } from './scenes/RoomScene';
import type { Agent } from './PhaserCanvas';

// WHY: island positions in Phaser canvas coordinates (1080 × 660).
// Mirrors the positions Record in RoomView.tsx so sprite layout matches DOM view.
const AGENT_POSITIONS: Record<string, { x: number; y: number }> = {
  // Core island (center)
  pm:               { x: 490,  y: 220 },
  // Dev island (left)
  dev:              { x: 130,  y: 400 },
  // Review island (right)
  rev:              { x: 700,  y: 400 },
  'rev-code':       { x: 810,  y: 400 },
  'rev-test':       { x: 920,  y: 400 },
  'rev-sec':        { x: 810,  y: 480 },
  // Retro island (bottom row)
  'retro-pm':       { x:  60,  y: 540 },
  'retro-research': { x: 180,  y: 540 },
  'retro-pj':       { x: 300,  y: 540 },
  'retro-proc':     { x: 420,  y: 540 },
  'retro-meta':     { x: 540,  y: 540 },
  'retro-counter':  { x: 660,  y: 540 },
  'retro-agg':      { x: 780,  y: 540 },
};

/**
 * Synchronise a list of agents to Phaser Graphics sprites in the given scene.
 *
 * - Agents present in `agents` but not in `scene.spriteMap` → sprites added
 * - Agents absent from `agents` but present in `scene.spriteMap` → sprites destroyed
 * - Each agent's status is applied via `scene.setAgentState()`
 *
 * WHY this is a standalone function (not a Scene method):
 * - Keeps RoomScene focused on Phaser lifecycle (SRP)
 * - Allows testing agent sync logic independently of the scene
 * - Called by PhaserCanvas on mount + by zustand subscribe on state change
 */
export function syncAgentsToScene(
  scene: RoomScene,
  agents: Agent[],
): void {
  const currentIds = new Set(agents.map((a) => a.id));
  const sceneMap = scene.spriteMap;

  // Remove sprites for agents that are no longer in the list
  for (const [id, sprite] of sceneMap.entries()) {
    if (!currentIds.has(id)) {
      sprite.destroy();
      sceneMap.delete(id);
    }
  }

  // Add sprites for new agents + apply current state
  for (const agent of agents) {
    if (!sceneMap.has(agent.id)) {
      const pos = AGENT_POSITIONS[agent.id] ?? { x: 50, y: 50 };
      // WHY: Phaser.GameObjects.Graphics used as placeholder sprite.
      // fillCircle with status color is visible in dev, replaced with
      // pixel art sprites in M5 (frontend-design).
      const graphics = scene.add.graphics();
      graphics.setPosition(pos.x, pos.y);
      sceneMap.set(agent.id, graphics);
    }

    // Apply initial / current status
    const status = agent.status ?? 'idle';
    scene.setAgentState(agent.id, status);
  }
}
