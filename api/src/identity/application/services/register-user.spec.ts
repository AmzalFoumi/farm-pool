import { registerSchema } from '@farm-pool/shared';
import { InMemoryUserRepository } from '../../infrastructure/persistence/in-memory-user.repository';
import { RegisterUser } from './register-user';
import { FakePasswordHasher, FakeTokenSigner } from './test-doubles';

describe('RegisterUser', () => {
  let users: InMemoryUserRepository;
  let register: RegisterUser;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    register = new RegisterUser(
      users,
      new FakePasswordHasher(),
      new FakeTokenSigner(),
    );
  });

  it('creates the account with a hashed password and signs the user in', async () => {
    const data = registerSchema.parse({
      displayName: '  Nimal Perera ',
      phone: '077 123 4567',
      password: 'longenough',
      role: 'farmer',
    });

    const result = await register.execute(data);

    expect(result.token).toBe(`token:${result.user.id}:farmer`);
    expect(result.user).toMatchObject({
      displayName: 'Nimal Perera',
      phone: '+94771234567',
      role: 'farmer',
      status: 'active',
    });
    expect(result.user).not.toHaveProperty('passwordHash');

    const stored = await users.findByPhone('+94771234567');
    expect(stored?.passwordHash).toBe('hashed:longenough');
  });

  it('every one of the four roles can self-register', async () => {
    for (const [i, role] of [
      'farmer',
      'buyer',
      'coordinator',
      'logistics',
    ].entries()) {
      const data = registerSchema.parse({
        displayName: `Person ${i}`,
        phone: `07100000${i}0`,
        password: 'longenough',
        role,
      });
      const result = await register.execute(data);
      expect(result.user.role).toBe(role);
    }
  });

  it('refuses a second account on the same phone with phone_taken', async () => {
    const data = registerSchema.parse({
      displayName: 'First',
      phone: '0771234567',
      password: 'longenough',
      role: 'buyer',
    });
    await register.execute(data);

    await expect(
      register.execute({ ...data, displayName: 'Second' }),
    ).rejects.toMatchObject({ code: 'phone_taken' });
  });
});
