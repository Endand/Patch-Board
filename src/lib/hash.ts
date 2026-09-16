import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/**
 * Hash a board password or owner secret for storage.
 *
 * scrypt rather than bcrypt so there is no native dependency to build on
 * Vercel. Format is `scrypt$<salt hex>$<key hex>`, with the algorithm name kept in
 * the string so it can be migrated later without a schema change.
 */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(secret.normalize("NFKC"), salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

/** Constant time check of a secret against a stored hash. */
export async function verifySecret(
  secret: string,
  stored: string | null,
): Promise<boolean> {
  if (!stored) return false;

  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const actual = await scryptAsync(
    secret.normalize("NFKC"),
    Buffer.from(saltHex, "hex"),
    KEY_LENGTH,
  );
  return timingSafeEqual(actual, expected);
}
