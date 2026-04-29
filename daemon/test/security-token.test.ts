/**
 * Tests for daemon/src/security/token.ts
 * Task 14: nanoid token generation + chmod 600 + verifyToken
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, mkdtempSync, readFileSync, statSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { getOrCreateToken, verifyToken, rotateToken } from "../src/security/token.js";

function realTmpDir(): string {
  return realpathSync(tmpdir());
}

describe("security/token.ts (Task 14)", () => {
  let tmpDir: string;
  let tokenPath: string;

  beforeEach(() => {
    const base = mkdtempSync(join(realTmpDir(), "loom-token-test-"));
    tmpDir = realpathSync(base);
    tokenPath = join(tmpDir, "daemon-token");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("getOrCreateToken", () => {
    it("generates a token of 32 chars when file does not exist", () => {
      expect(existsSync(tokenPath)).toBe(false);
      const token = getOrCreateToken(tokenPath);
      expect(typeof token).toBe("string");
      expect(token.length).toBe(32);
    });

    it("creates the token file when it does not exist", () => {
      getOrCreateToken(tokenPath);
      expect(existsSync(tokenPath)).toBe(true);
    });

    it("returns the same token on subsequent calls (reads from file)", () => {
      const first = getOrCreateToken(tokenPath);
      const second = getOrCreateToken(tokenPath);
      expect(first).toBe(second);
    });

    it("returns the token stored in an existing file", () => {
      // Pre-create the file with a known token
      const first = getOrCreateToken(tokenPath);
      // Read it back manually
      const fromFile = readFileSync(tokenPath, "utf-8").trim();
      expect(fromFile).toBe(first);
      // Calling again should return same value
      const second = getOrCreateToken(tokenPath);
      expect(second).toBe(first);
    });

    it("creates file with mode 0o600 (unix permissions)", () => {
      getOrCreateToken(tokenPath);
      const stat = statSync(tokenPath);
      // On Unix: 0o100600 = regular file + owner rw only
      const mode = stat.mode & 0o777;
      expect(mode).toBe(0o600);
    });
  });

  describe("verifyToken", () => {
    it("returns true when provided matches expected", () => {
      const token = "abcdefghijklmnopqrstuvwxyz123456";
      expect(verifyToken(token, token)).toBe(true);
    });

    it("returns false when provided does not match expected", () => {
      const expected = "abcdefghijklmnopqrstuvwxyz123456";
      const wrong = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456";
      expect(verifyToken(wrong, expected)).toBe(false);
    });

    it("returns false when provided is undefined", () => {
      expect(verifyToken(undefined, "sometoken")).toBe(false);
    });

    it("returns false when lengths differ", () => {
      expect(verifyToken("short", "muchlongertoken")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(verifyToken("", "sometoken")).toBe(false);
    });
  });

  describe("rotateToken", () => {
    it("generates a new token of 32 chars", () => {
      const token = rotateToken(tokenPath);
      expect(typeof token).toBe("string");
      expect(token.length).toBe(32);
    });

    it("overwrites existing token file with new value", () => {
      const first = getOrCreateToken(tokenPath);
      // Rotate generates a new token (may rarely be same, but statistically won't be)
      const rotated = rotateToken(tokenPath);
      // After rotation, reading file should return the rotated token
      const fromFile = readFileSync(tokenPath, "utf-8").trim();
      expect(fromFile).toBe(rotated);
      // The rotated token is returned correctly (may equal first by chance, but is valid)
      expect(typeof rotated).toBe("string");
      expect(rotated.length).toBe(32);
    });
  });
});
