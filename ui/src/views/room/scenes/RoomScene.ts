/**
 * RoomScene — Phaser Scene for the claude-loom dev room.
 *
 * WHY (SPEC §3.6.9.1 / §3.6.9.5):
 * - Self-owned Phaser Scene (not relying on phaser-react or external wrappers)
 * - Background color derives from CSS token `--p-bg-floor` so 3 themes work
 *   without hard-coding color values in the scene (SPEC §3.6.9 3-theme goal)
 * - MutationObserver watches data-theme attribute changes on <html> and
 *   immediately redraws background — no polling required
 *
 * Asset note: tile map JSON is a placeholder for M3.0.
 * Pixel art asset replacement is deferred to M5 (frontend-design).
 */
import Phaser from 'phaser';

/** Read --p-bg-floor CSS token from the document root, fallback to default. */
function getFloorBgColor(): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--p-bg-floor')
    .trim();
  // WHY: fallback to a warm default matching the pop theme floor color
  return value || '#e8dcc8';
}

export class RoomScene extends Phaser.Scene {
  private observer: MutationObserver | null = null;
  // Sprite map for agent sprites (populated in agentSpriteSync — Step 3)
  readonly spriteMap: Map<string, Phaser.GameObjects.Graphics> = new Map();

  constructor() {
    super({ key: 'RoomScene' });
  }

  preload(): void {
    // WHY: load placeholder tile map — consumed in create() for zone metadata.
    // Real tile sheets are M5, so we load only the JSON descriptor here.
    this.load.json('room-base', 'assets/tiles/room-base.json');
  }

  create(): void {
    // Set initial background color from CSS token
    this.cameras.main.setBackgroundColor(getFloorBgColor());

    // WHY: observe data-theme attribute changes so the scene reacts to theme
    // switches without requiring a re-mount of the Phaser game instance.
    this.observer = new MutationObserver((_mutations) => {
      this.cameras.main.setBackgroundColor(getFloorBgColor());
    });
    this.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }

  /**
   * Set the visual state of an agent's sprite (idle / busy / fail).
   * Called by agentSpriteSync when zustand agent state changes.
   * WHY: single entry point for all sprite state transitions — easy to test.
   */
  setAgentState(
    agentId: string,
    status: 'idle' | 'busy' | 'fail',
  ): void {
    const sprite = this.spriteMap.get(agentId);
    if (!sprite) return;
    // State colors as Phaser hex numbers (placeholder visual — M5 for pixel art)
    const COLOR_MAP: Record<string, number> = {
      idle: 0x8fa8c8,
      busy: 0x6366f1,
      fail: 0xef4444,
    };
    sprite.clear();
    sprite.fillStyle(COLOR_MAP[status] ?? 0x8fa8c8);
    sprite.fillCircle(0, 0, 16);
  }

  shutdown(): void {
    // WHY: disconnect MutationObserver on scene shutdown to avoid memory leaks
    // when the scene is stopped / restarted.
    this.observer?.disconnect();
    this.observer = null;
  }
}
