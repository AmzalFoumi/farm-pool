import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { PasswordHasher } from '../../application/ports/password-hasher';

/**
 * Password hashing with scrypt from Node's own `crypto` — no native build step, which matters
 * on a team split across Windows and macOS (this is why `bcrypt` was not used).
 *
 * Stored format: `scrypt$N$r$p$<salt base64>$<hash base64>`. The parameters travel with the
 * hash, so they can be raised later and old hashes still verify. N=16384, r=8, p=1 is the
 * common interactive-login setting (~16 MB, tens of milliseconds); the api is not the
 * bottleneck a farmer on 3G notices.
 */
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export class ScryptPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const key = await derive(plain, salt, N, R, P);
    return [
      'scrypt',
      N,
      R,
      P,
      salt.toString('base64'),
      key.toString('base64'),
    ].join('$');
  }

  async verify(plain: string, stored: string): Promise<boolean> {
    const parsed = parse(stored);
    if (!parsed) return false;
    const key = await derive(plain, parsed.salt, parsed.n, parsed.r, parsed.p);
    return key.length === parsed.key.length && timingSafeEqual(key, parsed.key);
  }
}

async function derive(
  plain: string,
  salt: Buffer,
  n: number,
  r: number,
  p: number,
): Promise<Buffer> {
  // maxmem must cover 128 * N * r bytes, plus headroom.
  const maxmem = 128 * n * r * 2;
  return new Promise((resolve, reject) => {
    scrypt(plain, salt, KEY_LENGTH, { N: n, r, p, maxmem }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

function parse(
  stored: string,
): { n: number; r: number; p: number; salt: Buffer; key: Buffer } | null {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (![n, r, p].every((x) => Number.isInteger(x) && x > 0)) return null;
  const salt = Buffer.from(parts[4], 'base64');
  const key = Buffer.from(parts[5], 'base64');
  if (salt.length === 0 || key.length === 0) return null;
  return { n, r, p, salt, key };
}
