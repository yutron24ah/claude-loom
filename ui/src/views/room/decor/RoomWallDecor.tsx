/**
 * RoomWallDecor — fixed wall decoration elements (branch sign, clock sign, window).
 * WHY: encapsulates the static upper-wall decor layer per SPEC §3.6.9.1 α-2.
 * Design source: redesign/screens/room.jsx L443-444 — signs at left:14/right:14,
 * top: wallTop-18 (wallTop=28 → top:10). Branch shows only "◆ branch: {branch}";
 * "claude-loom" brand is TopBar's responsibility (M2 fix). R-6 positioning fix.
 */

interface RoomWallDecorProps {
  /**
   * Container width — no longer used for sign positioning (R-6: signs use
   * left:14 / right:14 CSS positioning). Kept optional for backward compat.
   * @deprecated Use CSS right:14 directly; will be removed in a future cleanup.
   */
  width?: number;
  /** Active git branch from scenario.branch. Default "main" for cold-start. */
  branch?: string;
  /** Current time string from scenario.now. Default "—" for cold-start. */
  now?: string;
}

export function RoomWallDecor({ branch = 'main', now = '—' }: RoomWallDecorProps) {
  // WHY: wallTop=28 matches redesign/screens/room.jsx L430 (const wallTop = 28).
  // Signs sit at top: wallTop - 18 = 10. left:14 / right:14 per L443-444 (R-6).
  const signTop = 10;
  return (
    <>
      {/* Branch sign — top left. WHY: brand "claude-loom" belongs to TopBar per M2 review. */}
      <div
        className="room-sign room-sign--branch"
        style={{ position: 'absolute', left: 14, top: signTop }}
      >
        ◆ branch: {branch}
      </div>

      {/* Clock sign — top right. WHY: right:14 matches redesign L444 (not left: width-150). */}
      <div
        className="room-sign room-sign--clock"
        style={{ position: 'absolute', right: 14, top: signTop }}
      >
        ☀ {now} JST
      </div>

      {/* Window — upper left wall */}
      <div
        className="room-window"
        style={{ position: 'absolute', left: 30, top: 32, width: 80, height: 56 }}
      />
    </>
  );
}
