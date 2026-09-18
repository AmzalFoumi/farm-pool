import { ScryptPasswordHasher } from './scrypt-password-hasher';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('verifies the password it hashed and rejects another', async () => {
    const hash = await hasher.hash('correct horse battery');
    expect(hash.startsWith('scrypt$16384$8$1$')).toBe(true);
    await expect(hasher.verify('correct horse battery', hash)).resolves.toBe(
      true,
    );
    await expect(hasher.verify('correct horse batter', hash)).resolves.toBe(
      false,
    );
  });

  it('salts: the same password hashes differently each time', async () => {
    const a = await hasher.hash('same');
    const b = await hasher.hash('same');
    expect(a).not.toBe(b);
    await expect(hasher.verify('same', b)).resolves.toBe(true);
  });

  it('returns false, not an exception, for a malformed stored hash', async () => {
    await expect(hasher.verify('x', 'not-a-hash')).resolves.toBe(false);
    await expect(hasher.verify('x', 'scrypt$0$8$1$AAAA$AAAA')).resolves.toBe(
      false,
    );
    await expect(hasher.verify('x', 'bcrypt$10$abc')).resolves.toBe(false);
  });
});
