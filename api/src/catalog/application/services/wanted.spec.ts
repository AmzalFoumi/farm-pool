import { createWantedSchema } from '@farm-pool/shared';
import { InMemoryWantedRepository } from '../../infrastructure/persistence/in-memory-wanted.repository';
import { CloseWanted } from './close-wanted';
import { CreateWanted } from './create-wanted';
import { ListWanted } from './list-wanted';

const input = createWantedSchema.parse({
  cropId: 'onion',
  quantityKg: 200,
  neededBy: '2026-10-01',
  district: '  Dambulla ',
  note: '',
});

describe('wanted requests', () => {
  let repo: InMemoryWantedRepository;
  let create: CreateWanted;
  let list: ListWanted;
  let close: CloseWanted;

  beforeEach(() => {
    repo = new InMemoryWantedRepository();
    create = new CreateWanted(repo);
    list = new ListWanted(repo);
    close = new CloseWanted(repo);
  });

  it('creates an open request owned by the caller, with optional fields left out', async () => {
    const result = await create.execute('buyer-1', input);

    expect(result).toMatchObject({
      buyerId: 'buyer-1',
      cropId: 'onion',
      district: 'Dambulla',
      status: 'open',
    });
    expect(result).not.toHaveProperty('maxPricePerKg');
    expect(result).not.toHaveProperty('note');
  });

  it('keeps a max price and a note when given', async () => {
    const result = await create.execute('buyer-1', {
      ...input,
      maxPricePerKg: 150,
      note: 'For a hotel kitchen',
    });
    expect(result.maxPricePerKg).toBe(150);
    expect(result.note).toBe('For a hotel kitchen');
  });

  it("mine=true lists only the caller's requests; otherwise every open one", async () => {
    const mine = await create.execute('buyer-1', input);
    const other = await create.execute('buyer-2', input);
    await close.execute('buyer-2', other.id);

    const own = await list.execute('buyer-1', true);
    expect(own.map((w) => w.id)).toEqual([mine.id]);

    const open = await list.execute('farmer-1', false);
    expect(open.map((w) => w.id)).toEqual([mine.id]);
  });

  it('only the owner can close, and only once', async () => {
    const created = await create.execute('buyer-1', input);

    await expect(close.execute('buyer-2', created.id)).rejects.toMatchObject({
      code: 'not_your_request',
      kind: 'forbidden',
    });

    const closed = await close.execute('buyer-1', created.id);
    expect(closed.status).toBe('closed');

    await expect(close.execute('buyer-1', created.id)).rejects.toMatchObject({
      code: 'wanted_already_closed',
      kind: 'conflict',
    });
    await expect(close.execute('buyer-1', 'missing')).rejects.toMatchObject({
      code: 'wanted_not_found',
    });
  });
});
