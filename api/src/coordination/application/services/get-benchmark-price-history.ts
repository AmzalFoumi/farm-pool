import type {
  BenchmarkPrice as BenchmarkPriceDto,
  CropId,
} from '@farm-pool/shared';
import { toBenchmarkPriceDto } from '../../domain/entities/benchmark-price';
import type { BenchmarkPriceRepository } from '../../domain/repositories/benchmark-price.repository';
import type { CooperativeRepository } from '../../domain/repositories/cooperative.repository';
import { CoordinationError } from '../errors';

/** A year of weekly publishes is plenty for a chart; nothing here needs more. */
export const HISTORY_LIMIT = 52;

/**
 * Every price a coordinator has published for one crop in their own district, newest first
 * (FARM-37) — real rows, not interpolation, for a price-change graph.
 */
export class GetBenchmarkPriceHistory {
  constructor(
    private readonly cooperatives: CooperativeRepository,
    private readonly benchmarkPrices: BenchmarkPriceRepository,
  ) {}

  async execute(
    coordinatorId: string,
    cropId: CropId,
  ): Promise<BenchmarkPriceDto[]> {
    const [cooperative] =
      await this.cooperatives.findByCoordinatorId(coordinatorId);
    if (!cooperative) {
      throw new CoordinationError(
        'not_found',
        'cooperative_not_found',
        'You do not run a cooperative yet',
      );
    }

    const history = await this.benchmarkPrices.findHistoryByCropAndDistrict(
      cropId,
      cooperative.district,
      HISTORY_LIMIT,
    );
    return history.map(toBenchmarkPriceDto);
  }
}
