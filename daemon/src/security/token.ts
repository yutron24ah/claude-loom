/**
 * Auth token: nanoid generation + chmod 600 + verify
 * SPEC §12 (token + chmod 600)
 * M1 Task 14
 */
import { nanoid } from "nanoid";
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { homedir } from "node:os";

const DEFAULT_TOKEN_PATH = `${homedir()}/.claude-loom/daemon-token`;

/**
 * Token を取得、無ければ生成して chmod 600 で保存。
 */
export function getOrCreateToken(tokenPath = DEFAULT_TOKEN_PATH): string {
  if (existsSync(tokenPath)) {
    return readFileSync(tokenPath, "utf-8").trim();
  }
  const token = nanoid(32);
  mkdirSync(dirname(tokenPath), { recursive: true });
  writeFileSync(tokenPath, token);
  try {
    chmodSync(tokenPath, 0o600);
  } catch {
    // Windows 等で chmod 無視されても token 自体は valid
  }
  return token;
}

/**
 * Token を verify（constant-time 比較）。
 */
export function verifyToken(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  if (provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < provided.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Token を rotate（既存 file 上書き）。
 */
export function rotateToken(tokenPath = DEFAULT_TOKEN_PATH): string {
  const token = nanoid(32);
  mkdirSync(dirname(tokenPath), { recursive: true });
  writeFileSync(tokenPath, token);
  try {
    chmodSync(tokenPath, 0o600);
  } catch {}
  return token;
}
