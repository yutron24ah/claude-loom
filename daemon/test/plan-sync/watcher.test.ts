/**
 * TDD tests for plan-sync/watcher.ts
 * RED phase — watcher module does not exist yet.
 *
 * WHY: chokidar is mocked to avoid real filesystem I/O.
 * fakeTimers are used to control the 500ms debounce.
 * LWW (Last Write Wins) logic is verified by controlling mtime vs dbUpdatedAt.
 * broadcaster.emitPlanConflict is mocked to assert conflict broadcasts.
 *
 * vi.hoisted is used to declare shared mock variables before vi.mock hoisting.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoist shared mock state so vi.mock factories can reference them
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  const changeHandlers: Array<() => void> = [];
  const mockWatcher = {
    on: vi.fn((event: string, handler: () => void) => {
      if (event === "change") changeHandlers.push(handler);
      return mockWatcher;
    }),
    close: vi.fn().mockResolvedValue(undefined),
  };

  const mockBroadcaster = {
    emitPlanConflict: vi.fn(),
    emitPlanChange: vi.fn(),
  };

  const mockParsePlanMarkdown = vi.fn(() => []);
  const mockDiffPlanItems = vi.fn(() => ({ added: [], removed: [], updated: [] }));

  const mockReadFile = vi.fn().mockResolvedValue("# PLAN\n");
  const mockStat = vi.fn().mockResolvedValue({ mtimeMs: 1000 });

  const mockDBSelect = vi.fn();
  const mockDB = { select: mockDBSelect };

  return {
    changeHandlers,
    mockWatcher,
    mockBroadcaster,
    mockParsePlanMarkdown,
    mockDiffPlanItems,
    mockReadFile,
    mockStat,
    mockDBSelect,
    mockDB,
  };
});

// ---------------------------------------------------------------------------
// Mock modules using hoisted variables (no top-level refs in factory)
// ---------------------------------------------------------------------------
vi.mock("chokidar", () => ({
  default: {
    watch: vi.fn(() => mocks.mockWatcher),
  },
  watch: vi.fn(() => mocks.mockWatcher),
}));

vi.mock("../../src/events/broadcaster.js", () => ({
  broadcaster: mocks.mockBroadcaster,
}));

vi.mock("../../src/plan-sync/parser.js", () => ({
  parsePlanMarkdown: mocks.mockParsePlanMarkdown,
  diffPlanItems: mocks.mockDiffPlanItems,
}));

vi.mock("node:fs/promises", () => ({
  default: { readFile: mocks.mockReadFile, stat: mocks.mockStat },
  readFile: mocks.mockReadFile,
  stat: mocks.mockStat,
}));

vi.mock("../../src/db/client.js", () => ({
  createDBClient: vi.fn(() => mocks.mockDB),
}));

import { createPlanWatcher } from "../../src/plan-sync/watcher.js";

describe("createPlanWatcher", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // Reset change handlers
    mocks.changeHandlers.length = 0;

    // Re-register the on() to collect change handlers
    mocks.mockWatcher.on.mockImplementation((event: string, handler: () => void) => {
      if (event === "change") mocks.changeHandlers.push(handler);
      return mocks.mockWatcher;
    });

    // Default mocks
    mocks.mockReadFile.mockResolvedValue("# PLAN\n");
    mocks.mockStat.mockResolvedValue({ mtimeMs: 1000 });
    mocks.mockParsePlanMarkdown.mockReturnValue([]);
    mocks.mockDiffPlanItems.mockReturnValue({ added: [], removed: [], updated: [] });
    mocks.mockWatcher.close.mockResolvedValue(undefined);

    // Default DB select chain — returns empty array
    const defaultSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    };
    mocks.mockDBSelect.mockReturnValue(defaultSelectChain);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function fireChanges(count = 1): void {
    for (let i = 0; i < count; i++) {
      mocks.changeHandlers.forEach((h) => h());
    }
  }

  it("returns a cleanup function", () => {
    const cleanup = createPlanWatcher({
      planPath: "/project/PLAN.md",
      projectId: "proj-1",
    });
    expect(typeof cleanup).toBe("function");
  });

  it("calls chokidar.watch with the plan file path", async () => {
    const chokidar = await import("chokidar");
    createPlanWatcher({
      planPath: "/project/PLAN.md",
      projectId: "proj-1",
    });
    // WHY: watcher.ts uses `import chokidar from "chokidar"` (default import),
    // so chokidar.default.watch is the entry point being checked.
    const watchFn = (chokidar.default as { watch: ReturnType<typeof vi.fn> }).watch;
    expect(watchFn).toHaveBeenCalledWith("/project/PLAN.md", expect.any(Object));
  });

  it("registers a change event listener", () => {
    createPlanWatcher({
      planPath: "/project/PLAN.md",
      projectId: "proj-1",
    });
    expect(mocks.changeHandlers).toHaveLength(1);
  });

  it("debounces rapid changes — 10 change events emit only 1 parse", async () => {
    createPlanWatcher({
      planPath: "/project/PLAN.md",
      projectId: "proj-1",
    });

    // Fire 10 rapid changes
    fireChanges(10);

    // No parsing yet (debounce pending)
    expect(mocks.mockReadFile).not.toHaveBeenCalled();

    // Advance past 500ms
    await vi.advanceTimersByTimeAsync(600);

    // Should have parsed exactly once
    expect(mocks.mockReadFile).toHaveBeenCalledTimes(1);
  });

  it("resets debounce timer on each change — parses once after last event", async () => {
    createPlanWatcher({
      planPath: "/project/PLAN.md",
      projectId: "proj-1",
    });

    // Fire change, advance 400ms, fire again — timer should reset
    fireChanges(1);
    await vi.advanceTimersByTimeAsync(400);
    fireChanges(1);
    await vi.advanceTimersByTimeAsync(400);
    // Still < 500ms since last event
    expect(mocks.mockReadFile).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);
    // Now 500ms since last event — should have parsed
    expect(mocks.mockReadFile).toHaveBeenCalledTimes(1);
  });

  it("uses file version (no conflict) when file mtime > db updatedAt", async () => {
    // file is newer — file wins (LWW), no conflict broadcast
    mocks.mockStat.mockResolvedValue({ mtimeMs: 2000 });
    const dbItems = [{ id: 1, status: "todo", title: "T1", updatedAt: new Date(1000), projectId: "proj-1", source: "file", sourcePath: null, parentId: null, body: null, position: 0 }];
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(dbItems),
    };
    mocks.mockDBSelect.mockReturnValue(selectChain);
    mocks.mockParsePlanMarkdown.mockReturnValue([{ id: "1", status: "done", title: "T1" }]);
    mocks.mockDiffPlanItems.mockReturnValue({ added: [], removed: [], updated: [{ id: "1", status: "done", title: "T1" }] });

    createPlanWatcher({
      planPath: "/project/PLAN.md",
      projectId: "proj-1",
    });

    fireChanges(1);
    await vi.advanceTimersByTimeAsync(600);

    expect(mocks.mockBroadcaster.emitPlanConflict).not.toHaveBeenCalled();
  });

  it("broadcasts conflict when DB is newer than file mtime", async () => {
    // DB is newer — conflict
    mocks.mockStat.mockResolvedValue({ mtimeMs: 1000 });
    const dbUpdatedAt = new Date(2000); // db newer
    const dbItems = [
      { id: 1, status: "todo", title: "T1", updatedAt: dbUpdatedAt, projectId: "proj-1", source: "file", sourcePath: null, parentId: null, body: null, position: 0 },
    ];
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(dbItems),
    };
    mocks.mockDBSelect.mockReturnValue(selectChain);
    mocks.mockParsePlanMarkdown.mockReturnValue([{ id: "1", status: "done", title: "T1" }]);
    mocks.mockDiffPlanItems.mockReturnValue({
      added: [],
      removed: [],
      updated: [{ id: "1", status: "done", title: "T1" }],
    });

    createPlanWatcher({
      planPath: "/project/PLAN.md",
      projectId: "proj-1",
    });

    fireChanges(1);
    await vi.advanceTimersByTimeAsync(600);

    expect(mocks.mockBroadcaster.emitPlanConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-1",
        conflictType: "file_vs_db",
        fileMtime: 1000,
        dbMtime: 2000,
        affectedItemIds: ["1"],
      }),
    );
  });

  it("cleanup function calls watcher.close()", async () => {
    const cleanup = createPlanWatcher({
      planPath: "/project/PLAN.md",
      projectId: "proj-1",
    });
    await cleanup();
    expect(mocks.mockWatcher.close).toHaveBeenCalled();
  });

  it("same mtime (tie) resolves to DB win — no conflict broadcast", async () => {
    // WHY: spec says same ms → DB-side wins, no conflict re-broadcast
    mocks.mockStat.mockResolvedValue({ mtimeMs: 1500 });
    const dbItems = [
      { id: 1, status: "todo", title: "T1", updatedAt: new Date(1500), projectId: "proj-1", source: "file", sourcePath: null, parentId: null, body: null, position: 0 },
    ];
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(dbItems),
    };
    mocks.mockDBSelect.mockReturnValue(selectChain);
    mocks.mockParsePlanMarkdown.mockReturnValue([{ id: "1", status: "done", title: "T1" }]);
    mocks.mockDiffPlanItems.mockReturnValue({ added: [], removed: [], updated: [{ id: "1", status: "done", title: "T1" }] });

    createPlanWatcher({
      planPath: "/project/PLAN.md",
      projectId: "proj-1",
    });

    fireChanges(1);
    await vi.advanceTimersByTimeAsync(600);

    expect(mocks.mockBroadcaster.emitPlanConflict).not.toHaveBeenCalled();
    // WHY: tie → DB wins silently — no plan.change broadcast either (spec §3.6.9.2)
    expect(mocks.mockBroadcaster.emitPlanChange).not.toHaveBeenCalled();
  });

  it("does not parse if no change events are fired", async () => {
    createPlanWatcher({
      planPath: "/project/PLAN.md",
      projectId: "proj-1",
    });
    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.mockReadFile).not.toHaveBeenCalled();
  });

  it("broadcasts plan.change with correct itemId and status when file wins", async () => {
    // WHY: file-wins + updated item → emitPlanChange called once with matching payload
    mocks.mockStat.mockResolvedValue({ mtimeMs: 3000 });
    const dbItems = [
      { id: 1, status: "todo", title: "T1", updatedAt: new Date(1000), projectId: "proj-1", source: "file", sourcePath: null, parentId: null, body: null, position: 0 },
    ];
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(dbItems),
    };
    mocks.mockDBSelect.mockReturnValue(selectChain);
    mocks.mockParsePlanMarkdown.mockReturnValue([{ id: "1", status: "doing", title: "T1" }]);
    mocks.mockDiffPlanItems.mockReturnValue({
      added: [],
      removed: [],
      updated: [{ id: "1", status: "doing", title: "T1" }],
    });

    createPlanWatcher({
      planPath: "/project/PLAN.md",
      projectId: "proj-1",
    });

    fireChanges(1);
    await vi.advanceTimersByTimeAsync(600);

    expect(mocks.mockBroadcaster.emitPlanChange).toHaveBeenCalledTimes(1);
    expect(mocks.mockBroadcaster.emitPlanChange).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "1",
        projectId: "proj-1",
        status: "doing",
      }),
    );
    expect(mocks.mockBroadcaster.emitPlanConflict).not.toHaveBeenCalled();
  });
});
