/**
 * RoomModeToggle — button to switch between normal and retro room modes.
 * WHY: ambient mode toggle per SPEC §3.6.9.1 α-2, retro mode activates retro gathering.
 * Design source: /tmp/claude-room-handoff/claude-room/project/room.jsx L329-331.
 */

interface RoomModeToggleProps {
  retroMode: boolean;
  onToggle: () => void;
  width: number;
}

export function RoomModeToggle({ retroMode, onToggle, width: _width }: RoomModeToggleProps) {
  return (
    <button
      className={`room-mode-toggle${retroMode ? ' room-mode-toggle--active' : ''}`}
      onClick={onToggle}
      style={{ position: 'absolute', right: 14, top: 168 }}
    >
      {retroMode ? '📋 通常モードへ' : '🔮 レトロ開始'}
    </button>
  );
}
