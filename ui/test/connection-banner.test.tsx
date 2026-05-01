/**
 * TDD test for ConnectionBanner (connection-banner.test.tsx)
 * WHY: verifies banner display/hide behavior based on connection status
 * before any implementation exists (RED commit).
 *
 * Principle 8: Test behavior, not implementation — we test what the user sees.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionBanner } from '@/notifications/ConnectionBanner';
import { useConnectionStore } from '@/store/connection';

describe('ConnectionBanner — connected state', () => {
  beforeEach(() => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
  });

  it('should NOT render the banner when status is connected', () => {
    const { container } = render(<ConnectionBanner />);
    expect(container.firstChild).toBeNull();
  });
});

describe('ConnectionBanner — disconnected state', () => {
  beforeEach(() => {
    useConnectionStore.setState({ status: 'disconnected', attempts: 1 });
  });

  it('should render the banner when status is disconnected', () => {
    render(<ConnectionBanner />);
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('should show "接続を確立中…" message for disconnected status', () => {
    render(<ConnectionBanner />);
    expect(screen.getByText(/接続を確立中/)).toBeDefined();
  });
});

describe('ConnectionBanner — reconnecting state', () => {
  beforeEach(() => {
    useConnectionStore.setState({ status: 'reconnecting', attempts: 2 });
  });

  it('should render the banner when status is reconnecting', () => {
    render(<ConnectionBanner />);
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('should show "切断、再接続中…" message for reconnecting status', () => {
    render(<ConnectionBanner />);
    expect(screen.getByText(/切断、再接続中/)).toBeDefined();
  });
});

describe('ConnectionBanner — connecting state', () => {
  beforeEach(() => {
    useConnectionStore.setState({ status: 'connecting', attempts: 0 });
  });

  it('should render the banner when status is connecting (initial)', () => {
    render(<ConnectionBanner />);
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('should show "接続を確立中…" message for connecting status', () => {
    render(<ConnectionBanner />);
    expect(screen.getByText(/接続を確立中/)).toBeDefined();
  });
});
