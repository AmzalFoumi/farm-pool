import type {
  BenchmarkPrice as BenchmarkPriceDto,
  CropId,
  SetBenchmarkPrice as SetBenchmarkPriceBody,
} from '@farm-pool/shared';
import { toBenchmarkPriceDto } from '../../domain/entities/benchmark-price';
import type { BenchmarkPriceRepository } from '../../domain/repositories/benchmark-price.repository';
import type { CooperativeRepository } from '../../domain/repositories/cooperative.repository';
import { CoordinationError } from '../errors';

/**
 * A coordinator setting a crop's price for their own district (FARM-37). `source` is always
 * `'manual'` — the coordinator is the source, not a feed (see `benchmark-price.ts` in
 * `packages/shared`). Setting the same crop again publishes a new price; it does not overwrite
 * the last one, so the crop's price-change history stays real.
 */
export class SetBenchmarkPrice {
  constructor(
    private readonly cooperatives: CooperativeRepository,
    private readonly benchmarkPrices: BenchmarkPriceRepository,
  ) {}

  async execute(
    coordinatorId: string,
    cropId: CropId,
    body: SetBenchmarkPriceBody,
  ): Promise<BenchmarkPriceDto> {
    const [cooperative] =
      await this.cooperatives.findByCoordinatorId(coordinatorId);
    if (!cooperative) {
      throw new CoordinationError(
        'not_found',
        'cooperative_not_found',
        'You do not run a cooperative yet',
      );
    }

    const price = await this.benchmarkPrices.create({
      cropId,
      district: cooperative.district,
      lowPricePerKg: body.lowPricePerKg,
      highPricePerKg: body.highPricePerKg,
      source: 'manual',
      setByCoordinatorId: coordinatorId,
    });

    return toBenchmarkPriceDto(price);
  }
}
