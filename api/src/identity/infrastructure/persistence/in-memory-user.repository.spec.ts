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

  it('returns copies, so editing a result does not change the stored user', async () => {
    const repo = new InMemoryUserRepository();
    const created = await repo.create(farmer);
    created.displayName = 'Changed';
    created.createdAt.setFullYear(2000);

    const stored = await repo.findById(created.id);
    expect(stored?.displayName).toBe('Nimal');
    expect(stored?.createdAt.getFullYear()).not.toBe(2000);
  });

  it('toPublicUser never includes the password hash', async () => {
    const repo = new InMemoryUserRepository();
    const user = await repo.create(farmer);
    const pub = toPublicUser(user) as Record<string, unknown>;

    expect(pub).not.toHaveProperty('passwordHash');
    expect(pub.createdAt).toBe(user.createdAt.toISOString());
  });

  it('activate flips pending_review to active, and is null otherwise (FARM-44)', async () => {
    const repo = new InMemoryUserRepository();
    const user = await repo.create({ ...farmer, status: 'pending_review' });

    expect(await repo.activate('does-not-exist')).toBeNull();

    const activated = await repo.activate(user.id);
    expect(activated?.status).toBe('active');
    expect(await repo.findById(user.id)).toMatchObject({ status: 'active' });

    // Already active: a second call is a no-op, not a re-activation.
    expect(await repo.activate(user.id)).toBeNull();
  });

  it('reject flips pending_review to suspended and records why, and is null otherwise (FARM-44)', async () => {
    const repo = new InMemoryUserRepository();
    const user = await repo.create({ ...farmer, status: 'pending_review' });

    const rejected = await repo.reject(user.id, 'Could not verify identity');
    expect(rejected?.status).toBe('suspended');
    expect(await repo.findById(user.id)).toMatchObject({
      status: 'suspended',
      rejectionReason: 'Could not verify identity',
    });

    // Already suspended: a second call is a no-op.
    expect(await repo.reject(user.id, 'Again')).toBeNull();
  });
});
