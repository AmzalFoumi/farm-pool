import jwt from 'jsonwebtoken';
import { IdentityError } from '../../application/errors';
import { JsonwebtokenTokenSigner } from './jsonwebtoken-token-signer';

const secret = 'unit-test-secret-that-is-at-least-32-characters';

describe('JsonwebtokenTokenSigner', () => {
  const signer = new JsonwebtokenTokenSigner({ secret, expiresIn: '1h' });

  it('signs claims that verify back with sub, role, iat and exp', async () => {
    const token = await signer.sign({ sub: 'user-1', role: 'farmer' });
    const payload = await signer.verify(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('farmer');
    expect(payload.exp - payload.iat).toBe(3600);
  });

  it('rejects a tampered token', async () => {
    const token = await signer.sign({ sub: 'user-1', role: 'farmer' });
    const [header, payload, signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...decode(payload), role: 'coordinator' }),
    ).toString('base64url');
    await expect(
      signer.verify(`${header}.${forged}.${signature}`),
    ).rejects.toMatchObject({ code: 'invalid_token' });
  });

  it('rejects a token signed with another secret', async () => {
    const other = new JsonwebtokenTokenSigner({
      secret: 'another-secret-that-is-also-32-characters-long',
      expiresIn: '1h',
    });
    const token = await other.sign({ sub: 'user-1', role: 'buyer' });
    await expect(signer.verify(token)).rejects.toBeInstanceOf(IdentityError);
  });

  it('rejects an expired token', async () => {
    const shortLived = new JsonwebtokenTokenSigner({
      secret,
      expiresIn: '-1s',
    });
    const token = await shortLived.sign({ sub: 'user-1', role: 'buyer' });
    await expect(signer.verify(token)).rejects.toMatchObject({
      code: 'invalid_token',
    });
  });

  it('rejects a validly signed token whose claims are not the agreed shape', async () => {
    const token = jwt.sign({ role: 'superuser' }, secret, {
      algorithm: 'HS256',
      subject: 'user-1',
      expiresIn: '1h',
    });
    await expect(signer.verify(token)).rejects.toMatchObject({
      code: 'invalid_token',
    });
  });
});

function decode(segment: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(segment, 'base64url').toString()) as Record<
    string,
    unknown
  >;
}
