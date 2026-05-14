/**
 * RoomWallDecor — fixed wall decoration elements (branch sign, clock sign, window).
 * WHY: encapsulates the static upper-wall decor layer per SPEC §3.6.9.1 α-2.
 * Design source: redesign/screens/room.jsx L443 — branch sign shows only
 * "◆ branch: {scenario.branch}"; "claude-loom" brand is TopBar's responsibility (M2 fix).
 */

interface RoomWallDecorProps {
  width: number;
  /** Active git branch from scenario.branch. Default "main" for cold-start. */
  branch?: string;
}

export function RoomWallDecor({ width, branch = 'main' }: RoomWallDecorProps) {
  return (
    <>
      {/* Branch sign — top left. WHY: brand "claude-loom" belongs to TopBar per M2 review. */}
      <div
        className="room-sign room-sign--branch"
        style={{ position: 'absolute', left: 20, top: 14 }}
      >
        ◆ branch: {branch}
      </div>

      {/* Clock sign — top right */}
      <div
        className="room-sign room-sign--clock"
        style={{ position: 'absolute', left: width - 150, top: 14 }}
      >
        ☀ 14:23 JST
      </div>

      {/* Window — upper left wall */}
      <div
        className="room-window"
        style={{ position: 'absolute', left: 30, top: 32, width: 80, height: 56 }}
      />
    </>
  );
}
