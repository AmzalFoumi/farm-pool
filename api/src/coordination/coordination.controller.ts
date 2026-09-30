import type {
  BenchmarkPrice,
  CooperativeFarmer,
  CoordinatorDashboard,
  CoordinatorTask,
  CropId,
  CropPriceContext,
  SetBenchmarkPrice as SetBenchmarkPriceBody,
} from '@farm-pool/shared';
import { cropIdSchema, setBenchmarkPriceSchema } from '@farm-pool/shared';
import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import type { AuthenticatedUser } from '../identity/auth/authenticated-request';
import { CurrentUser } from '../identity/auth/current-user.decorator';
import { Allow } from '../identity/auth/roles.decorator';
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe';
import { GetBenchmarkPriceHistory } from './application/services/get-benchmark-price-history';
import { GetBenchmarkPrices } from './application/services/get-benchmark-prices';
import { GetCoordinatorDashboard } from './application/services/get-coordinator-dashboard';
import { GetCoordinatorTasks } from './application/services/get-coordinator-tasks';
import { ListCooperativeFarmers } from './application/services/list-cooperative-farmers';
import { SetBenchmarkPrice } from './application/services/set-benchmark-price';

/**
 * HTTP entry points for the coordination domain. Thin: validate, call one use-case, return.
 * `CoordinationError` is turned into a status by `DomainErrorFilter` (app-wide).
 *
 * | Method | Path                    | Allow                         | Result                          |
 * | ------ | ----------------------- | ------------------------------ | -------------------------------- |
 * | GET    | /coordination/dashboard | `cooperative:read-dashboard`   | 200 `CoordinatorDashboard` · 404 |
 * | GET    | /coordination/farmers   | `cooperative:read-farmers`     | 200 `CooperativeFarmer[]` · 404  |
 * | GET    | /coordination/tasks     | `cooperative:read-tasks`       | 200 `CoordinatorTask[]` · 404    |
 * | GET    | /coordination/benchmarks | `benchmark:read`              | 200 `CropPriceContext[]` · 404  |
 * | PUT    | /coordination/benchmarks/:cropId | `benchmark:set`       | 200 `BenchmarkPrice` · 400 · 404 |
 * | GET    | /coordination/benchmarks/:cropId/history | `benchmark:read` | 200 `BenchmarkPrice[]` · 404 |
 */
@Controller('coordination')
export class CoordinationController {
  constructor(
    private readonly getCoordinatorDashboard: GetCoordinatorDashboard,
    private readonly listCooperativeFarmers: ListCooperativeFarmers,
    private readonly getCoordinatorTasks: GetCoordinatorTasks,
    private readonly getBenchmarkPrices: GetBenchmarkPrices,
    private readonly setBenchmarkPrice: SetBenchmarkPrice,
    private readonly getBenchmarkPriceHistory: GetBenchmarkPriceHistory,
  ) {}

  @Allow('cooperative:read-dashboard')
  @Get('dashboard')
  dashboard(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CoordinatorDashboard> {
    return this.getCoordinatorDashboard.execute(user.sub);
  }

  @Allow('cooperative:read-farmers')
  @Get('farmers')
  farmers(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CooperativeFarmer[]> {
    return this.listCooperativeFarmers.execute(user.sub);
  }

  @Allow('cooperative:read-tasks')
  @Get('tasks')
  tasks(@CurrentUser() user: AuthenticatedUser): Promise<CoordinatorTask[]> {
    return this.getCoordinatorTasks.execute(user.sub);
  }

  @Allow('benchmark:read')
  @Get('benchmarks')
  benchmarks(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CropPriceContext[]> {
    return this.getBenchmarkPrices.execute(user.sub);
  }

  @Allow('benchmark:set')
  @Put('benchmarks/:cropId')
  setBenchmark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cropId', new ZodValidationPipe(cropIdSchema)) cropId: CropId,
    @Body(new ZodValidationPipe(setBenchmarkPriceSchema))
    body: SetBenchmarkPriceBody,
  ): Promise<BenchmarkPrice> {
    return this.setBenchmarkPrice.execute(user.sub, cropId, body);
  }

  @Allow('benchmark:read')
  @Get('benchmarks/:cropId/history')
  benchmarkHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cropId', new ZodValidationPipe(cropIdSchema)) cropId: CropId,
  ): Promise<BenchmarkPrice[]> {
    return this.getBenchmarkPriceHistory.execute(user.sub, cropId);
  }
}
