import type { CoordinatorDashboard } from '@farm-pool/shared';
import { Controller, Get } from '@nestjs/common';
import type { AuthenticatedUser } from '../identity/auth/authenticated-request';
import { CurrentUser } from '../identity/auth/current-user.decorator';
import { Allow } from '../identity/auth/roles.decorator';
import { GetCoordinatorDashboard } from './application/services/get-coordinator-dashboard';

/**
 * HTTP entry points for the coordination domain. Thin: validate, call one use-case, return.
 * `CoordinationError` is turned into a status by `DomainErrorFilter` (app-wide).
 *
 * | Method | Path                    | Allow                        | Result                              |
 * | ------ | ----------------------- | ----------------------------- | ------------------------------------ |
 * | GET    | /coordination/dashboard | `cooperative:read-dashboard`  | 200 `CoordinatorDashboard` · 404     |
 */
@Controller('coordination')
export class CoordinationController {
  constructor(
    private readonly getCoordinatorDashboard: GetCoordinatorDashboard,
  ) {}

  @Allow('cooperative:read-dashboard')
  @Get('dashboard')
  dashboard(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CoordinatorDashboard> {
    return this.getCoordinatorDashboard.execute(user.sub);
  }
}
