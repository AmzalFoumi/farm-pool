import { DuplicatePhoneError } from '../../domain/repositories/user.repository';
import { toPublicUser } from '../../domain/entities/user';
import { InMemoryUserRepository } from './in-memory-user.repository';

const farmer = {
  displayName: 'Nimal',
  phone: '+94771234567',
  passwordHash: 'hash',
  role: 'farmer' as const,
};

describe('InMemoryUserRepository', () => {
  it('creates a user with an id, active status and timestamps', async () => {
    const repo = new InMemoryUserRepository();
    const user = await repo.create(farmer);

    expect(user.id).toBeTruthy();
    expect(user.status).toBe('active');
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(await repo.findById(user.id)).toEqual(user);
    expect(await repo.findByPhone('+94771234567')).toEqual(user);
  });

  it('rejects a second user with the same phone', async () => {
    const repo = new InMemoryUserRepository();
    await repo.create(farmer);

    await expect(
      repo.create({ ...farmer, displayName: 'Other' }),
    ).rejects.toBeInstanceOf(DuplicatePhoneError);
  });

  it('leaves email absent when not given, and matches it case-insensitively when it is', async () => {
    const repo = new InMemoryUserRepository();
    const noEmail = await repo.create(farmer);
    const withEmail = await repo.create({
      ...farmer,
      phone: '+94770000000',
      email: 'Buyer@Example.com',
      role: 'buyer',
    });

    expect('email' in noEmail).toBe(false);
    expect(withEmail.email).toBe('buyer@example.com');
    expect(await repo.findByEmail('BUYER@example.com')).toEqual(withEmail);
  });

  it('toPublicUser never includes the password hash', async () => {
    const repo = new InMemoryUserRepository();
    const user = await repo.create(farmer);
    const pub = toPublicUser(user) as Record<string, unknown>;

    expect(pub).not.toHaveProperty('passwordHash');
    expect(pub.createdAt).toBe(user.createdAt.toISOString());
  });
});
