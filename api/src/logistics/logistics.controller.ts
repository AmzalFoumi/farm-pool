import {
  confirmPickupSchema,
  type AssignedDriver,
  type ConfirmPickupData,
  type JobDetail,
  type JobSummary,
} from '@farm-pool/shared';
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../identity/auth/authenticated-request';
import { CurrentUser } from '../identity/auth/current-user.decorator';
import { Allow } from '../identity/auth/roles.decorator';
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe';
import { AcceptJob } from './application/services/accept-job';
import {
  ConfirmDelivery,
  ConfirmPickup,
} from './application/services/confirm-delivery-step';
import { GetAssignedDriver } from './application/services/get-assigned-driver';
import { GetJob } from './application/services/get-job';
import { ListMyJobs } from './application/services/list-my-jobs';
import { ListOpenJobs } from './application/services/list-open-jobs';

/**
 * HTTP entry points for the logistics domain. Thin: validate, call one use-case, return.
 *
 * | Method | Path                          | Allow                  | Result                          |
 * | ------ | ----------------------------- | ---------------------- | ------------------------------- |
 * | GET    | /logistics/jobs               | `delivery:read-jobs`   | 200 `JobSummary[]` · 409 no vehicle |
 * | GET    | /logistics/jobs/mine          | `delivery:read-jobs`   | 200 `JobSummary[]`              |
 * | GET    | /logistics/jobs/:orderId      | `delivery:read-jobs`   | 200 `JobDetail` · 403 · 404     |
 * | POST   | /logistics/jobs/:orderId/accept | `delivery:accept`    | 200 `JobDetail` · 409 · 404     |
 * | POST   | /logistics/jobs/:orderId/pickup | `delivery:confirm`   | 200 `JobDetail` · 403 · 409     |
 * | POST   | /logistics/jobs/:orderId/deliver | `delivery:confirm`  | 200 `JobDetail` · 403 · 409     |
 * | GET    | /logistics/orders/:orderId/driver | `delivery:read-driver` | 200 `AssignedDriver` · 403 · 404 |
 *
 * `mine` is declared before `:orderId` so the router does not read it as an id.
 *
 * Only the pickup takes a body — the weight actually loaded. Everything else is identified by the
 * order it belongs to and acted on by the caller's own token, so there is nothing to send.
 */
@Controller('logistics')
export class LogisticsController {
  constructor(
    private readonly listOpenJobs: ListOpenJobs,
    private readonly listMyJobs: ListMyJobs,
    private readonly getJob: GetJob,
    private readonly acceptJob: AcceptJob,
    private readonly getAssignedDriver: GetAssignedDriver,
    private readonly confirmPickup: ConfirmPickup,
    private readonly confirmDelivery: ConfirmDelivery,
  ) {}

  @Allow('delivery:read-jobs')
  @Get('jobs')
  board(@CurrentUser() user: AuthenticatedUser): Promise<JobSummary[]> {
    return this.listOpenJobs.execute(user.sub);
  }

  @Allow('delivery:read-jobs')
  @Get('jobs/mine')
  mine(@CurrentUser() user: AuthenticatedUser): Promise<JobSummary[]> {
    return this.listMyJobs.execute(user.sub);
  }

  @Allow('delivery:read-jobs')
  @Get('jobs/:orderId')
  one(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<JobDetail> {
    return this.getJob.execute(user.sub, orderId);
  }

  @Allow('delivery:accept')
  @Post('jobs/:orderId/accept')
  @HttpCode(200)
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<JobDetail> {
    return this.acceptJob.execute(user.sub, orderId);
  }

  @Allow('delivery:confirm')
  @Post('jobs/:orderId/pickup')
  @HttpCode(200)
  pickup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Body(new ZodValidationPipe(confirmPickupSchema)) body: ConfirmPickupData,
  ): Promise<JobDetail> {
    return this.confirmPickup.execute(user.sub, orderId, body.collectedKg);
  }

  @Allow('delivery:confirm')
  @Post('jobs/:orderId/deliver')
  @HttpCode(200)
  deliver(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<JobDetail> {
    return this.confirmDelivery.execute(user.sub, orderId);
  }

  @Allow('delivery:read-driver')
  @Get('orders/:orderId/driver')
  driver(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<AssignedDriver> {
    return this.getAssignedDriver.execute(user.sub, orderId);
  }
}
