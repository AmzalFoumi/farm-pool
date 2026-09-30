import type { AssignedDriver, JobDetail, JobSummary } from '@farm-pool/shared';
import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../identity/auth/authenticated-request';
import { CurrentUser } from '../identity/auth/current-user.decorator';
import { Allow } from '../identity/auth/roles.decorator';
import { AcceptJob } from './application/services/accept-job';
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
 * | GET    | /logistics/orders/:orderId/driver | `delivery:read-driver` | 200 `AssignedDriver` · 403 · 404 |
 *
 * `mine` is declared before `:orderId` so the router does not read it as an id.
 *
 * No request bodies anywhere here, so no `ZodValidationPipe`: a job is identified by the order it
 * belongs to and claimed by the caller's own token. There is nothing for a client to send.
 */
@Controller('logistics')
export class LogisticsController {
  constructor(
    private readonly listOpenJobs: ListOpenJobs,
    private readonly listMyJobs: ListMyJobs,
    private readonly getJob: GetJob,
    private readonly acceptJob: AcceptJob,
    private readonly getAssignedDriver: GetAssignedDriver,
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

  @Allow('delivery:read-driver')
  @Get('orders/:orderId/driver')
  driver(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<AssignedDriver> {
    return this.getAssignedDriver.execute(user.sub, orderId);
  }
}
