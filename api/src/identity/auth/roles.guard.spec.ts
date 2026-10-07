import type { AccountStatus, Role } from '@farm-pool/shared';
import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PENDING_OK_KEY, ROLES_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';

function contextWith(
  user: { sub: string; role: Role; status?: AccountStatus } | undefined,
) {
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
  const requireRoles = (roles: Role[] | undefined, pendingOk = false) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === ROLES_KEY) return roles;
      if (key === PENDING_OK_KEY) return pendingOk;
      return undefined;
    });

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
      guard.canActivate(
        contextWith({ sub: '1', role: 'coordinator', status: 'active' }),
      ),
    ).toBe(true);
  });

  it('forbids a role that is not listed', () => {
    requireRoles(['coordinator']);
    expect(() =>
      guard.canActivate(
        contextWith({ sub: '1', role: 'farmer', status: 'active' }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('answers 401, not 403, when no user was attached', () => {
    requireRoles(['coordinator']);
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  // FARM-44: the account-status gate.
  it('forbids a pending_review account on a role-restricted route', () => {
    requireRoles(['farmer']);
    const error = catchError(() =>
      guard.canActivate(
        contextWith({ sub: '1', role: 'farmer', status: 'pending_review' }),
      ),
    );
    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toMatchObject({
      code: 'account_pending_review',
    });
  });

  it('forbids a suspended account on a role-restricted route', () => {
    requireRoles(['farmer']);
    const error = catchError(() =>
      guard.canActivate(
        contextWith({ sub: '1', role: 'farmer', status: 'suspended' }),
      ),
    );
    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toMatchObject({ code: 'account_suspended' });
  });

  it('lets a pending_review account through a route marked @AllowWhilePending()', () => {
    requireRoles(['farmer'], true);
    expect(
      guard.canActivate(
        contextWith({ sub: '1', role: 'farmer', status: 'pending_review' }),
      ),
    ).toBe(true);
  });

  it('still lets a pending_review account through a route with no role requirement at all (e.g. /identity/me)', () => {
    requireRoles(undefined);
    expect(
      guard.canActivate(
        contextWith({ sub: '1', role: 'farmer', status: 'pending_review' }),
      ),
    ).toBe(true);
  });
});

/** Nest's guard rejects synchronously; `toThrow()` can't be combined with checking the thrown
 *  object's own properties without an `any`-typed matcher, so this unwraps it by hand. */
function catchError(fn: () => unknown): ForbiddenException {
  try {
    fn();
  } catch (error) {
    if (error instanceof ForbiddenException) return error;
    throw error;
  }
  throw new Error('Expected fn to throw a ForbiddenException');
}
