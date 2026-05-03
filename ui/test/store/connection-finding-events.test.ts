/**
 * M4 t7: consistency_finding_new + spec_change_detected toast event wire tests.
 * TDD RED phase — tests written before implementation.
 *
 * WHY: SPEC §3.6.9.4 defines toast events; M4 t7 adds events 7 (consistency_finding_new)
 * and 8 (spec_change_detected). Principle §8: test the observable behavior
 * (toast emissions via toastBus) not internal subscription details.
 */
import { describe, it, expect } from 'vitest';
import {
  toastBus,
  emitConsistencyFindingNew,
  emitSpecChangeDetected,
} from '@/notifications/toastBus';
import type { Toast } from '@/notifications/toastBus';

// ---------------------------------------------------------------------------
// toastBus helper function tests
// ---------------------------------------------------------------------------

describe('emitConsistencyFindingNew — existing helper verified for M4 t7 wire', () => {
  it('emitConsistencyFindingNew emits consistency_finding_new warning toast', () => {
    const received: Toast[] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));

    emitConsistencyFindingNew('整合性の問題が検出されました');

    unsub();
    expect(received).toHaveLength(1);
    expect(received[0].event).toBe('consistency_finding_new');
    expect(received[0].kind).toBe('warning');
    expect(received[0].ttl_ms).toBeNull();
    expect(received[0].message).toBe('整合性の問題が検出されました');
  });

  it('emitConsistencyFindingNew uses default message when called without argument', () => {
    const received: Toast[] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));

    emitConsistencyFindingNew();

    unsub();
    expect(received).toHaveLength(1);
    expect(received[0].event).toBe('consistency_finding_new');
    expect(received[0].message).toBeTruthy();
  });
});

describe('emitSpecChangeDetected — new helper for M4 t7', () => {
  it('emits spec_change_detected toast with warning kind', () => {
    // WHY: spec_change_detected is a badge-style persistent notification
    // (SPEC §7.5 Step 3 — user must acknowledge the spec change).
    const received: Toast[] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));

    emitSpecChangeDetected('SPEC 変更が検知されました');

    unsub();
    expect(received).toHaveLength(1);
    expect(received[0].event).toBe('spec_change_detected');
    expect(received[0].kind).toBe('warning');
    expect(received[0].ttl_ms).toBeNull();
    expect(received[0].message).toBe('SPEC 変更が検知されました');
  });

  it('emitSpecChangeDetected uses default message when called without argument', () => {
    const received: Toast[] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));

    emitSpecChangeDetected();

    unsub();
    expect(received).toHaveLength(1);
    expect(received[0].event).toBe('spec_change_detected');
    expect(received[0].message).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ToastEvent type union includes new events
// ---------------------------------------------------------------------------

describe('ToastEvent type — includes spec_change_detected', () => {
  it('toastBus emits event with spec_change_detected event field without TypeScript error', () => {
    // WHY: Principle §6 — make illegal states unrepresentable.
    // The ToastEvent union must include 'spec_change_detected'.
    const received: Toast[] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));

    toastBus.emit({
      id: 'test-spec-change',
      kind: 'warning',
      event: 'spec_change_detected' as any, // cast for pre-impl RED — real type after GREEN
      message: '⚠️ SPEC 変更検知',
      ttl_ms: null,
    });

    unsub();
    expect(received).toHaveLength(1);
    expect(received[0].event).toBe('spec_change_detected');
  });
});

// ---------------------------------------------------------------------------
// useSpecChangeSubscription / useFindingNewSubscription hook shape tests
// ---------------------------------------------------------------------------

describe('connection.ts — exports useSpecChangeSubscription hook', () => {
  it('exports useSpecChangeSubscription function from store/connection', async () => {
    const mod = await import('@/store/connection');
    expect(typeof (mod as any).useSpecChangeSubscription).toBe('function');
  });
});

describe('connection.ts — exports useConsistencyFindingSubscription hook', () => {
  it('exports useConsistencyFindingSubscription function from store/connection', async () => {
    const mod = await import('@/store/connection');
    expect(typeof (mod as any).useConsistencyFindingSubscription).toBe('function');
  });
});
