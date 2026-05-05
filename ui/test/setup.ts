/**
 * Vitest setup file — imports jest-dom matchers for DOM assertions.
 *
 * WHY no global Phaser mock:
 * M0.11.4 t17 physically deleted Phaser from this project (DOM/SVG-only era).
 * The global vi.mock('phaser', ...) block that was here is no longer needed.
 */
import '@testing-library/jest-dom';
