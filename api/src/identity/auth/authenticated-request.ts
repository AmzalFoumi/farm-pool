import type { JwtPayload } from '@farm-pool/shared';
import type { Request } from 'express';

/** The verified token claims, attached to the request by `JwtAuthGuard`. */
export type AuthenticatedUser = JwtPayload;

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
