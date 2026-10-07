import type {
  BenchmarkPrice,
  Cooperative,
  CooperativeFarmer,
  CoordinatorDashboard,
  CoordinatorTask,
  CropId,
  CropPriceContext,
  JoinCooperativeInput,
  PublicUser,
  RejectFarmerInput,
  SetBenchmarkPrice as SetBenchmarkPriceBody,
} from '@farm-pool/shared';
import {
  cropIdSchema,
  joinCooperativeSchema,
  rejectFarmerSchema,
  setBenchmarkPriceSchema,
} from '@farm-pool/shared';
import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import type { AuthenticatedUser } from '../identity/auth/authenticated-request';
import { CurrentUser } from '../identity/auth/current-user.decorator';
import { Allow, AllowWhilePending } from '../identity/auth/roles.decorator';
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe';
import { ApproveFarmer } from './application/services/approve-farmer';
import { GetBenchmarkPriceHistory } from './application/services/get-benchmark-price-history';
import { GetBenchmarkPrices } from './application/services/get-benchmark-prices';
import { GetCoordinatorDashboard } from './application/services/get-coordinator-dashboard';
import { GetCoordinatorTasks } from './application/services/get-coordinator-tasks';
import { JoinCooperative } from './application/services/join-cooperative';
import { ListCooperativeFarmers } from './application/services/list-cooperative-farmers';
import { RejectFarmer } from './application/services/reject-farmer';
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
 * | POST   | /coordination/apply     | `cooperative:join` (while pending) | 200 `Cooperative` · 404 |
 * | PUT    | /coordination/farmers/:farmerId/approve | `farmers:approve` | 200 `PublicUser` · 404 · 409 |
 * | PUT    | /coordination/farmers/:farmerId/reject | `farmers:reject`  | 200 `PublicUser` · 400 · 404 · 409 |
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
    private readonly joinCooperative: JoinCooperative,
    private readonly approveFarmer: ApproveFarmer,
    private readonly rejectFarmer: RejectFarmer,
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

  @Allow('cooperative:join')
  @AllowWhilePending()
  @Post('apply')
  apply(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(joinCooperativeSchema))
    body: JoinCooperativeInput,
  ): Promise<Cooperative> {
    return this.joinCooperative.execute(user.sub, body.district);
  }

  @Allow('farmers:approve')
  @Put('farmers/:farmerId/approve')
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('farmerId') farmerId: string,
  ): Promise<PublicUser> {
    return this.approveFarmer.execute(user.sub, farmerId);
  }

  @Allow('farmers:reject')
  @Put('farmers/:farmerId/reject')
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('farmerId') farmerId: string,
    @Body(new ZodValidationPipe(rejectFarmerSchema)) body: RejectFarmerInput,
  ): Promise<PublicUser> {
    return this.rejectFarmer.execute(user.sub, farmerId, body.reason);
  }
}
