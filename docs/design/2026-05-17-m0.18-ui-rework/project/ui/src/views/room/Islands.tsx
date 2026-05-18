/**
 * Islands — 3 role-zoned floor islands (PM / DEV / REVIEW).
 * WHY: visual separation of agent role zones per SPEC §3.6.9.1 α-2.
 * Design source: /tmp/claude-room-handoff/claude-room/project/room.jsx L311-321.
 */

interface IslandsProps {
  width: number;
  height: number;
  /** default true; retro mode passes false to hide all islands */
  visible?: boolean;
}

export function Islands({ width, height: _height, visible = true }: IslandsProps) {
  if (!visible) return null;

  return (
    <>
      {/* PM island — center top */}
      <div
        className="room-island room-island--pm"
        style={{ position: 'absolute', left: width / 2 - 80, top: 200, width: 160, height: 160 }}
      />
      {/* DEV island — left */}
      <div
        className="room-island room-island--dev"
        style={{ position: 'absolute', left: 40, top: 380, width: 240, height: 160 }}
      />
      {/* REVIEW island — right */}
      <div
        className="room-island room-island--review"
        style={{ position: 'absolute', left: width - 410, top: 380, width: 380, height: 160 }}
      />

      {/* Island signs */}
      <div
        className="room-sign room-sign--island--pm"
        style={{ position: 'absolute', left: width / 2 - 50, top: 178 }}
      >
        ◆ PM
      </div>
      <div
        className="room-sign room-sign--island--dev"
        style={{ position: 'absolute', left: 130, top: 358 }}
      >
        ◆ DEV
      </div>
      <div
        className="room-sign room-sign--island--review"
        style={{ position: 'absolute', left: width - 280, top: 358 }}
      >
        ◆ REVIEW
      </div>
    </>
  );
}
