import type { Role } from '@farm-pool/shared';
import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';

function contextWith(user: { sub: string; role: Role } | undefined) {
  return {
    getHandler: () => handler,
    getClass: () => RolesGuardSpecController,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

// Stand-ins for a route handler and its controller class, so the Reflector has targets.
const handler = () => undefined;
class RolesGuardSpecController {}

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);
  const requireRoles = (roles: Role[] | undefined) =>
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key) => (key === ROLES_KEY ? roles : undefined));

  afterEach(() => jest.restoreAllMocks());

  it('lets any signed-in role through a route with no role requirement', () => {
    requireRoles(undefined);
    expect(
      guard.canActivate(contextWith({ sub: '1', role: 'logistics' })),
    ).toBe(true);
  });

  it('allows a listed role', () => {
    requireRoles(['coordinator']);
    expect(
      guard.canActivate(contextWith({ sub: '1', role: 'coordinator' })),
    ).toBe(true);
  });

  it('forbids a role that is not listed', () => {
    requireRoles(['coordinator']);
    expect(() =>
      guard.canActivate(contextWith({ sub: '1', role: 'farmer' })),
    ).toThrow(ForbiddenException);
  });

  it('answers 401, not 403, when no user was attached', () => {
    requireRoles(['coordinator']);
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(
      UnauthorizedException,
    );
  });
});
