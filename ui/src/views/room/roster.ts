/**
 * ui/src/views/room/roster.ts — re-export from canonical SSoT.
 *
 * WHY: M0.18 Phase 0 migrated the SSoT to ui/src/data/roster.ts.
 * This file is kept as a re-export for backward-compat consumers
 * that import from the views/room path. Phase D cleanup will migrate
 * all consumers to import directly from ui/src/data/roster.ts.
 */
export { ROSTER, type RosterEntry, type HatType, type GroupType, type KindType, type PoseType } from '../../data/roster';
