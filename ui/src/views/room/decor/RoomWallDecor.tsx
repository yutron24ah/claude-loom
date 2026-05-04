/**
 * RoomWallDecor — fixed wall decoration elements (branch sign, clock sign, window).
 * WHY: encapsulates the static upper-wall decor layer per SPEC §3.6.9.1 α-2.
 * Design source: /tmp/claude-room-handoff/claude-room/project/room.jsx L207-211.
 */

interface RoomWallDecorProps {
  width: number;
}

export function RoomWallDecor({ width }: RoomWallDecorProps) {
  return (
    <>
      {/* Branch sign — top left */}
      <div
        className="room-sign room-sign--branch"
        style={{ position: 'absolute', left: 20, top: 14 }}
      >
        ◆ claude-loom — branch: main
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
