/**
 * RoomView — persistent Room canvas placeholder.
 * WHY: Task 9 will port the full room.jsx DOM-based implementation.
 * Here we only provide the structural mount point with data-testid
 * so AppShell tests can verify the canvas is always in the DOM.
 */
export function RoomView(): JSX.Element {
  return (
    <div
      data-testid="room-canvas"
      className="w-full h-full bg-bg1 grid place-items-center"
    >
      <span className="text-fg1">Room (Task 9 で実装)</span>
    </div>
  );
}
