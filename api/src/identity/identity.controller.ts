import {
  driverVehicleSchema,
  loginSchema,
  registerSchema,
  saveLocationSchema,
  type AuthResponse,
  type DriverVehicle,
  type LoginInput,
  type PublicUser,
  type RegisterData,
  type SaveLocationData,
} from '@farm-pool/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe';
import { GetMe } from './application/services/get-me';
import { ListUsers } from './application/services/list-users';
import { LoginUser } from './application/services/login-user';
import { RegisterUser } from './application/services/register-user';
import { SaveDriverVehicle } from './application/services/save-driver-vehicle';
import {
  ForgetLocation,
  SaveLocation,
} from './application/services/save-location';
import type { AuthenticatedUser } from './auth/authenticated-request';
import { CurrentUser } from './auth/current-user.decorator';
import { Public } from './auth/public.decorator';
import { Allow } from './auth/roles.decorator';

/**
 * HTTP entry points for the identity domain. Thin on purpose: validate the body with the
 * shared schema, call one use-case, return its result. Errors are handled by
 * `IdentityErrorFilter` and the guards, so nothing here catches anything.
 *
 * | Method | Path                | Who                    | Result              |
 * | ------ | ------------------- | ---------------------- | ------------------- |
 * | POST   | /identity/register  | anyone                 | 201 `AuthResponse`  |
 * | POST   | /identity/login     | anyone                 | 200 `AuthResponse`  |
 * | GET    | /identity/me        | any signed-in role     | 200 `PublicUser`    |
 * | PUT    | /identity/me/vehicle| `driver:update-vehicle`| 200 `PublicUser`    |
 * | POST   | /identity/me/locations | `location:save`     | 200 `PublicUser` · 409 full |
 * | DELETE | /identity/me/locations/:id | `location:save` | 200 `PublicUser`    |
 * | GET    | /identity/users     | `users:list` (coord.)  | 200 `PublicUser[]`  |
 */
@Controller('identity')
export class IdentityController {
  constructor(
    private readonly registerUser: RegisterUser,
    private readonly loginUser: LoginUser,
    private readonly getMe: GetMe,
    private readonly listUsers: ListUsers,
    private readonly saveDriverVehicle: SaveDriverVehicle,
    private readonly saveLocation: SaveLocation,
    private readonly forgetLocation: ForgetLocation,
  ) {}

  @Public()
  @Post('register')
  register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterData,
  ): Promise<AuthResponse> {
    return this.registerUser.execute(body);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
  ): Promise<AuthResponse> {
    return this.loginUser.execute(body);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): Promise<PublicUser> {
    return this.getMe.execute(user.sub);
  }

  /** A delivery partner's own vehicle (FARM-45). PUT: the whole vehicle, every time. */
  @Allow('driver:update-vehicle')
  @Put('me/vehicle')
  vehicle(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(driverVehicleSchema)) body: DriverVehicle,
  ): Promise<PublicUser> {
    return this.saveDriverVehicle.execute(user.sub, body);
  }

  /**
   * A buyer's saved delivery places (FARM-26). POST adds or updates one by label; the whole list
   * comes back on the user, so the app never has to merge its own copy.
   */
  @Allow('location:save')
  @Post('me/locations')
  @HttpCode(200)
  addLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(saveLocationSchema)) body: SaveLocationData,
  ): Promise<PublicUser> {
    return this.saveLocation.execute(user.sub, body);
  }

  @Allow('location:save')
  @Delete('me/locations/:id')
  removeLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PublicUser> {
    return this.forgetLocation.execute(user.sub, id);
  }

  @Allow('users:list')
  @Get('users')
  users(): Promise<PublicUser[]> {
    return this.listUsers.execute();
  }
}
