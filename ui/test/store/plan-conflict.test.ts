/**
 * TDD tests for store/planConflict.ts
 * RED phase — planConflict store does not exist yet.
 *
 * WHY: conflict state must be trackable (set/clear) and backup changes must
 * survive to localStorage and be restorable — testing these behaviors before
 * implementation keeps the store API honest.
 *
 * WHY localStorage mock: the zustand store runs in the vitest/jsdom environment
 * but Node globalThis.localStorage is not the jsdom one. We provide an in-memory
 * mock so backupChange/restoreBackup persistence can be verified without browser.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// In-memory localStorage mock — install before module imports
// ---------------------------------------------------------------------------
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

import { usePlanConflictStore } from '@/store/planConflict';
import type { PlanConflict } from '@/store/planConflict';

const MOCK_CONFLICT: PlanConflict = {
  projectId: 'proj-1',
  conflictType: 'file_vs_db',
  fileMtime: 1000,
  dbMtime: 2000,
  affectedItemIds: ['t1', 't2'],
  detectedAt: 1700000000000,
};

describe('usePlanConflictStore — initial state', () => {
  beforeEach(() => {
    usePlanConflictStore.setState({ conflict: null, backupChanges: {} });
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('conflict is null initially', () => {
    const { conflict } = usePlanConflictStore.getState();
    expect(conflict).toBeNull();
  });

  it('backupChanges is empty initially', () => {
    const { backupChanges } = usePlanConflictStore.getState();
    expect(backupChanges).toEqual({});
  });
});

describe('usePlanConflictStore — setConflict', () => {
  beforeEach(() => {
    usePlanConflictStore.setState({ conflict: null, backupChanges: {} });
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('sets conflict state', () => {
    usePlanConflictStore.getState().setConflict(MOCK_CONFLICT);
    expect(usePlanConflictStore.getState().conflict).toEqual(MOCK_CONFLICT);
  });

  it('overwrites previous conflict', () => {
    usePlanConflictStore.getState().setConflict(MOCK_CONFLICT);
    const updated: PlanConflict = { ...MOCK_CONFLICT, dbMtime: 9999 };
    usePlanConflictStore.getState().setConflict(updated);
    expect(usePlanConflictStore.getState().conflict?.dbMtime).toBe(9999);
  });
});

describe('usePlanConflictStore — clearConflict', () => {
  beforeEach(() => {
    usePlanConflictStore.setState({ conflict: MOCK_CONFLICT, backupChanges: {} });
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('resets conflict to null', () => {
    usePlanConflictStore.getState().clearConflict();
    expect(usePlanConflictStore.getState().conflict).toBeNull();
  });
});

describe('usePlanConflictStore — backupChange', () => {
  beforeEach(() => {
    usePlanConflictStore.setState({ conflict: MOCK_CONFLICT, backupChanges: {} });
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('stores a backup change in state', () => {
    usePlanConflictStore.getState().backupChange('t1', { status: 'doing', title: 'Task 1' });
    const { backupChanges } = usePlanConflictStore.getState();
    expect(backupChanges['t1']).toEqual({ status: 'doing', title: 'Task 1' });
  });

  it('persists backup to localStorage', () => {
    usePlanConflictStore.getState().backupChange('t1', { status: 'done', title: 'Task 1' });
    const key = 'claude-loom:plan-conflict-backup:proj-1';
    expect(localStorageMock.setItem).toHaveBeenCalledWith(key, expect.any(String));
    const stored = localStorageMock.getItem(key);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed['t1']).toEqual({ status: 'done', title: 'Task 1' });
  });

  it('merges multiple backupChange calls', () => {
    usePlanConflictStore.getState().backupChange('t1', { status: 'doing' });
    usePlanConflictStore.getState().backupChange('t2', { status: 'done' });
    const { backupChanges } = usePlanConflictStore.getState();
    expect(Object.keys(backupChanges)).toHaveLength(2);
    expect(backupChanges['t2']).toEqual({ status: 'done' });
  });

  it('overwrites existing backup for same itemId', () => {
    usePlanConflictStore.getState().backupChange('t1', { status: 'doing' });
    usePlanConflictStore.getState().backupChange('t1', { status: 'done' });
    expect(usePlanConflictStore.getState().backupChanges['t1']).toEqual({ status: 'done' });
  });
});

describe('usePlanConflictStore — restoreBackup', () => {
  beforeEach(() => {
    usePlanConflictStore.setState({ conflict: MOCK_CONFLICT, backupChanges: {} });
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('loads backup from localStorage into state', () => {
    // Pre-seed localStorage as if a previous session saved backup
    const key = 'claude-loom:plan-conflict-backup:proj-1';
    const data = JSON.stringify({ t3: { status: 'todo', title: 'T3' } });
    localStorageMock.setItem(key, data);

    usePlanConflictStore.getState().restoreBackup('proj-1');
    const { backupChanges } = usePlanConflictStore.getState();
    expect(backupChanges['t3']).toEqual({ status: 'todo', title: 'T3' });
  });

  it('does nothing when no localStorage backup exists', () => {
    // No localStorage entry
    usePlanConflictStore.getState().restoreBackup('proj-x');
    const { backupChanges } = usePlanConflictStore.getState();
    expect(backupChanges).toEqual({});
  });
});
