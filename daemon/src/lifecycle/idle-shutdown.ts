import { broadcaster } from "../events/broadcaster.js";

const DEFAULT_IDLE_MS = 30 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL_MS = 60 * 1000; // check every 1 minute

export function startIdleShutdown(opts: {
  idleMs?: number;
  onShutdown: () => void | Promise<void>;
}) {
  const idleMs = opts.idleMs ?? DEFAULT_IDLE_MS;
  let lastActivity = Date.now();

  const updateActivity = () => {
    lastActivity = Date.now();
  };

  // Track all broadcaster events as activity
  broadcaster.on("*", updateActivity);

  const interval = setInterval(async () => {
    if (Date.now() - lastActivity >= idleMs) {
      clearInterval(interval);
      broadcaster.off("*", updateActivity);
      await opts.onShutdown();
    }
  }, CHECK_INTERVAL_MS);

  return {
    stop() {
      clearInterval(interval);
      broadcaster.off("*", updateActivity);
    },
  };
}
