import type {
  CooperativeFarmer,
  CoordinatorDashboard,
  CoordinatorTask,
} from '@farm-pool/shared';
import { Controller, Get } from '@nestjs/common';
import type { AuthenticatedUser } from '../identity/auth/authenticated-request';
import { CurrentUser } from '../identity/auth/current-user.decorator';
import { Allow } from '../identity/auth/roles.decorator';
import { GetCoordinatorDashboard } from './application/services/get-coordinator-dashboard';
import { GetCoordinatorTasks } from './application/services/get-coordinator-tasks';
import { ListCooperativeFarmers } from './application/services/list-cooperative-farmers';

/**
 * HTTP entry points for the coordination domain. Thin: validate, call one use-case, return.
 * `CoordinationError` is turned into a status by `DomainErrorFilter` (app-wide).
 *
 * | Method | Path                    | Allow                         | Result                          |
 * | ------ | ----------------------- | ------------------------------ | -------------------------------- |
 * | GET    | /coordination/dashboard | `cooperative:read-dashboard`   | 200 `CoordinatorDashboard` · 404 |
 * | GET    | /coordination/farmers   | `cooperative:read-farmers`     | 200 `CooperativeFarmer[]` · 404  |
 * | GET    | /coordination/tasks     | `cooperative:read-tasks`       | 200 `CoordinatorTask[]` · 404    |
 */
@Controller('coordination')
export class CoordinationController {
  constructor(
    private readonly getCoordinatorDashboard: GetCoordinatorDashboard,
    private readonly listCooperativeFarmers: ListCooperativeFarmers,
    private readonly getCoordinatorTasks: GetCoordinatorTasks,
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
}
