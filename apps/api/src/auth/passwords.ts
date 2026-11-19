import argon2 from 'argon2';

/**
 * argon2id with the OWASP-recommended baseline (19 MiB, 2 iterations, 1 lane).
 * Parameters are stored in each hash, so they can be raised later without breaking old hashes.
 */
const options = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, options);
}

let dummyHash: Promise<string> | undefined;

/**
 * Verifies a password. When the account does not exist (or has no password), a dummy hash is
 * verified instead so that response time does not reveal whether the email is registered.
 */
export async function verifyPassword(hash: string | null | undefined, password: string) {
  if (!hash) {
    dummyHash ??= hashPassword('sonora-dummy-password-for-timing');
    await argon2.verify(await dummyHash, password).catch(() => false);
    return false;
  }
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
