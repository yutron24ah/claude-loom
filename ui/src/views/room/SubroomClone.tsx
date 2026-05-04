/**
 * SubroomClone — half-transparent ghost cat for worktree sub-agent.
 *
 * WHY ghost/half-transparent: A worktree sub-agent is a clone of the main
 * developer working in an isolated branch. Visually showing it as a ghost
 * communicates "same agent, different context" without confusion.
 *
 * Ported from /tmp/claude-room-handoff/claude-room/project/room.jsx L131-141.
 * CSS classes (.subroom-clone, .subroom-clone__sprite, etc.) are defined in
 * ui/src/styles/tokens.css (Phase A SSoT). @keyframes subroom-pulse lives there too.
 */
import { CatSprite } from '../../components/CatSprite';
import type { RosterEntry } from '../../data/roster';

type SubroomStatus = 'busy' | 'review' | 'idle';

interface SubroomCloneProps {
  x: number;
  y: number;
  cat: RosterEntry;
  branch: string;
  status?: SubroomStatus;
  onClick?: () => void;
}

export function SubroomClone({
  x,
  y,
  cat,
  branch,
  status = 'busy',
  onClick,
}: SubroomCloneProps): JSX.Element {
  return (
    <button
      className="subroom-clone"
      onClick={onClick}
      style={{ left: x, top: y }}
    >
      <div className="subroom-clone__sprite">
        <CatSprite size={36} fur={cat.fur} cheek={cat.cheek} hat={cat.hat} pose="work" />
      </div>
      <div className="subroom-clone__label">
        <span className={`subroom-clone__dot subroom-clone__dot--${status}`} />
        <span>@{branch}</span>
      </div>
    </button>
  );
}
