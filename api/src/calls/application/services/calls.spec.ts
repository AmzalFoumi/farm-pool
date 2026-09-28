import type { CallStatus } from '@farm-pool/shared';
import type { CallTokenSigner } from '../../domain/services/call-token-signer';
import { InMemoryCallRepository } from '../../infrastructure/persistence/in-memory-call.repository';
import { EndCall } from './end-call';
import { CALL_TOKEN_TTL_SECONDS, IssueCallToken } from './issue-call-token';

const NOW = new Date('2026-09-29T10:00:00.000Z');

describe('calls', () => {
  let calls: InMemoryCallRepository;
  let signed: { channel: string; account: string; ttl: number }[];
  let signer: CallTokenSigner;
  let issue: IssueCallToken;
  let end: EndCall;

  async function callIn(status: CallStatus): Promise<string> {
    const call = await calls.create({
      listingId: 'listing-1',
      callerId: 'buyer-1',
      callerName: 'Kamal',
      calleeId: 'farmer-1',
      calleeName: 'Nimal',
    });
    if (status !== 'requested') await calls.update(call.id, { status });
    return call.id;
  }

  beforeEach(() => {
    calls = new InMemoryCallRepository();
    signed = [];
    signer = {
      sign: (channel, account, ttl) => {
        signed.push({ channel, account, ttl });
        return { appId: 'app', token: 'signed-token' };
      },
    };
    issue = new IssueCallToken(calls, signer, () => NOW);
    end = new EndCall(calls, () => NOW);
  });

  it('gives each participant a pass for the server-chosen channel and their own account', async () => {
    const id = await callIn('active');

    const buyer = await issue.execute('buyer-1', id);
    const farmer = await issue.execute('farmer-1', id);

    expect(buyer).toEqual({
      appId: 'app',
      channel: `call_${id}`,
      token: 'signed-token',
      account: 'buyer-1',
      expiresAt: new Date(
        NOW.getTime() + CALL_TOKEN_TTL_SECONDS * 1000,
      ).toISOString(),
    });
    expect(farmer.account).toBe('farmer-1');
    expect(signed.every((s) => s.ttl === CALL_TOKEN_TTL_SECONDS)).toBe(true);
  });

  it('stamps startedAt on the first pass only', async () => {
    const id = await callIn('active');
    await issue.execute('buyer-1', id);
    const later = new IssueCallToken(
      calls,
      signer,
      () => new Date('2026-09-29T11:00:00Z'),
    );
    await later.execute('farmer-1', id);

    expect((await calls.findById(id))?.startedAt).toEqual(NOW);
  });

  it('refuses a pass to someone not on the call', async () => {
    const id = await callIn('active');
    await expect(issue.execute('stranger', id)).rejects.toMatchObject({
      kind: 'forbidden',
      code: 'not_your_call',
    });
    expect(signed).toHaveLength(0);
  });

  it.each<CallStatus>(['requested', 'declined', 'ended'])(
    'refuses a pass while the call is %s',
    async (status) => {
      const id = await callIn(status);
      await expect(issue.execute('buyer-1', id)).rejects.toMatchObject({
        kind: 'conflict',
        code: 'call_not_active',
      });
    },
  );

  it('404s an unknown call', async () => {
    await expect(issue.execute('buyer-1', 'nope')).rejects.toMatchObject({
      kind: 'not_found',
      code: 'call_not_found',
    });
  });

  it('reports calls_not_configured when the server has no Agora keys', async () => {
    const id = await callIn('active');
    const unconfigured = new IssueCallToken(
      calls,
      { sign: () => null },
      () => NOW,
    );
    await expect(unconfigured.execute('buyer-1', id)).rejects.toMatchObject({
      code: 'calls_not_configured',
    });
  });

  it('ends an active call, and ending again changes nothing', async () => {
    const id = await callIn('active');

    const ended = await end.execute('farmer-1', id);
    expect(ended).toMatchObject({
      status: 'ended',
      endedAt: NOW.toISOString(),
    });

    const again = await new EndCall(calls, () => new Date(0)).execute(
      'buyer-1',
      id,
    );
    expect(again.endedAt).toBe(NOW.toISOString());
  });

  it('will not end a call that was never accepted, or someone else’s', async () => {
    const id = await callIn('requested');
    await expect(end.execute('buyer-1', id)).rejects.toMatchObject({
      code: 'call_not_active',
    });
    await expect(end.execute('stranger', id)).rejects.toMatchObject({
      code: 'not_your_call',
    });
  });
});
