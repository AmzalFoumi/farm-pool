import { InMemoryUserRepository } from '../../infrastructure/persistence/in-memory-user.repository';
import { LoginUser } from './login-user';
import { FakePasswordHasher, FakeTokenSigner } from './test-doubles';

describe('LoginUser', () => {
  let users: InMemoryUserRepository;
  let login: LoginUser;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    login = new LoginUser(
      users,
      new FakePasswordHasher(),
      new FakeTokenSigner(),
    );
    await users.create({
      displayName: 'Kamala',
      phone: '+94771234567',
      passwordHash: 'hashed:secret123',
      role: 'buyer',
    });
  });

  it('signs in with the phone in any accepted spelling', async () => {
    for (const identifier of [
      '0771234567',
      '077 123 4567',
      '+94 77 123 4567',
      '94771234567',
    ]) {
      const result = await login.execute({ identifier, password: 'secret123' });
      expect(result.user.phone).toBe('+94771234567');
      expect(result.token).toBe(`token:${result.user.id}:buyer`);
    }
  });

  it('rejects a wrong password with invalid_credentials', async () => {
    await expect(
      login.execute({ identifier: '0771234567', password: 'secret124' }),
    ).rejects.toMatchObject({ code: 'invalid_credentials' });
  });

  it('rejects an unknown phone with the same invalid_credentials', async () => {
    await expect(
      login.execute({ identifier: '0719999999', password: 'secret123' }),
    ).rejects.toMatchObject({ code: 'invalid_credentials' });
  });

  it('rejects an identifier that is not a phone number (email comes later)', async () => {
    await expect(
      login.execute({
        identifier: 'kamala@example.com',
        password: 'secret123',
      }),
    ).rejects.toMatchObject({ code: 'invalid_credentials' });
  });
});
