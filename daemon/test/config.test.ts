/**
 * Tests for daemon/src/config.ts
 * Task 17: ~/.claude-loom/config.json read/write wrapper (SPEC §6.10)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { readConfig, writeConfig, updateConfig, configSchema } from "../src/config.js";

function realTmpDir(): string {
  return realpathSync(tmpdir());
}

describe("config.ts (Task 17, SPEC §6.10)", () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    const base = mkdtempSync(join(realTmpDir(), "loom-config-test-"));
    tmpDir = realpathSync(base);
    configPath = join(tmpDir, "config.json");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("readConfig", () => {
    it("returns default values when config file does not exist", () => {
      expect(existsSync(configPath)).toBe(false);
      const config = readConfig(configPath);
      expect(config.port).toBe(5757);
      expect(config.bindAddress).toBe("127.0.0.1");
      expect(config.idleShutdownMinutes).toBe(30);
      expect(config.eventRetentionDays).toBe(30);
      expect(config.eventMaxSizeMb).toBe(200);
      expect(typeof config.dbPath).toBe("string");
      expect(config.dbPath.length).toBeGreaterThan(0);
    });

    it("loads values from existing config file", () => {
      writeFileSync(
        configPath,
        JSON.stringify({
          port: 6000,
          bindAddress: "0.0.0.0",
          idleShutdownMinutes: 60,
          eventRetentionDays: 14,
          eventMaxSizeMb: 100,
          dbPath: "/custom/path/loom.db",
        })
      );

      const config = readConfig(configPath);
      expect(config.port).toBe(6000);
      expect(config.bindAddress).toBe("0.0.0.0");
      expect(config.idleShutdownMinutes).toBe(60);
      expect(config.eventRetentionDays).toBe(14);
      expect(config.eventMaxSizeMb).toBe(100);
      expect(config.dbPath).toBe("/custom/path/loom.db");
    });

    it("falls back to defaults for fields missing from partial file", () => {
      writeFileSync(configPath, JSON.stringify({ port: 7000 }));
      const config = readConfig(configPath);
      expect(config.port).toBe(7000);
      // Other fields should use defaults
      expect(config.bindAddress).toBe("127.0.0.1");
      expect(config.idleShutdownMinutes).toBe(30);
    });
  });

  describe("writeConfig", () => {
    it("creates the config file with JSON content", () => {
      const defaults = configSchema.parse({});
      writeConfig(defaults, configPath);
      expect(existsSync(configPath)).toBe(true);
      const raw = readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.port).toBe(5757);
    });

    it("creates parent directories if needed", () => {
      const nestedPath = join(tmpDir, "nested", "dir", "config.json");
      const defaults = configSchema.parse({});
      writeConfig(defaults, nestedPath);
      expect(existsSync(nestedPath)).toBe(true);
    });

    it("roundtrips: writeConfig + readConfig returns same values", () => {
      const custom = configSchema.parse({
        port: 8080,
        bindAddress: "127.0.0.1",
        idleShutdownMinutes: 15,
        eventRetentionDays: 7,
        eventMaxSizeMb: 50,
      });
      writeConfig(custom, configPath);
      const loaded = readConfig(configPath);
      expect(loaded.port).toBe(8080);
      expect(loaded.idleShutdownMinutes).toBe(15);
      expect(loaded.eventRetentionDays).toBe(7);
      expect(loaded.eventMaxSizeMb).toBe(50);
    });

    it("writes atomically (file is valid JSON even if interrupted)", () => {
      // We can't truly test atomicity but we can verify the file is valid JSON
      const config = configSchema.parse({ port: 9999 });
      writeConfig(config, configPath);
      const raw = readFileSync(configPath, "utf-8");
      expect(() => JSON.parse(raw)).not.toThrow();
    });
  });

  describe("updateConfig", () => {
    it("applies patch to existing config", () => {
      // Write an initial config
      writeConfig(configSchema.parse({ port: 5757 }), configPath);

      const updated = updateConfig({ port: 6666 }, configPath);
      expect(updated.port).toBe(6666);
      // Other fields unchanged
      expect(updated.bindAddress).toBe("127.0.0.1");
    });

    it("creates config with defaults and patch when file does not exist", () => {
      expect(existsSync(configPath)).toBe(false);
      const updated = updateConfig({ port: 7777 }, configPath);
      expect(updated.port).toBe(7777);
      expect(updated.bindAddress).toBe("127.0.0.1");
      expect(existsSync(configPath)).toBe(true);
    });

    it("persists patch to disk (readConfig after updateConfig returns patched value)", () => {
      const updated = updateConfig({ idleShutdownMinutes: 45 }, configPath);
      expect(updated.idleShutdownMinutes).toBe(45);

      // Re-read from disk
      const fromDisk = readConfig(configPath);
      expect(fromDisk.idleShutdownMinutes).toBe(45);
    });

    it("returns the full merged config object", () => {
      const result = updateConfig({ port: 5000, eventMaxSizeMb: 100 }, configPath);
      // All fields present with correct types
      expect(typeof result.port).toBe("number");
      expect(typeof result.bindAddress).toBe("string");
      expect(typeof result.idleShutdownMinutes).toBe("number");
      expect(typeof result.eventRetentionDays).toBe("number");
      expect(typeof result.eventMaxSizeMb).toBe("number");
      expect(typeof result.dbPath).toBe("string");
    });
  });
});
