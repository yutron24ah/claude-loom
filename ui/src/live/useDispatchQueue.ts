/**
 * useDispatchQueue — derives dispatch queue state from daemon /events stream.
 *
 * Consumes the WebSocket scenario store (via useScenario) and derives
 * the list of active, queued, and leaving skill dispatch items.
 *
 * The daemon emits agent state changes that include skill dispatch events.
 * This hook maps that live state to the SummonQueue component's QueueItem shape.
 *
 * WHY separate hook: SRP — queue state derivation is distinct from rendering.
 * useScenario owns WS connection; this hook owns the queue shape derivation.
 *
 * Source: spec/ui-arch.md §8.2.1 SummonQueue — "useDispatchQueue hook 新設,
 * daemon /events stream 由来の queue state derive"
 */
import { useMemo } from 'react';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { QueueItem } from '../views/room/SummonQueue';

export interface UseDispatchQueueResult {
  items: QueueItem[];
}

/**
 * Derives a list of summon queue items from the live scenario agent state.
 * Each agent that is busy or has an active skill dispatch contributes one entry.
 */
export function useDispatchQueue(): UseDispatchQueueResult {
  const scenario = useScenario();

  const items = useMemo((): QueueItem[] => {
    const result: QueueItem[] = [];

    for (const [agentId, state] of Object.entries(scenario.agents)) {
      if (!state) continue;

      const skillId = state.currentTool ?? agentId;

      if (state.status === 'busy') {
        result.push({
          skillId,
          status: 'active',
          ttlSeconds: null,
        });
      } else if (state.status === 'review') {
        result.push({
          skillId,
          status: 'queued',
          ttlSeconds: null,
        });
      }
    }

    return result;
  }, [scenario.agents]);

  return { items };
}
