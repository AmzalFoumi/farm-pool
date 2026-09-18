import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'farm-pool:isPublic';

/**
 * Opt a route (or a whole controller) out of the token check. The `JwtAuthGuard` is global, so
 * every endpoint requires a token unless it says otherwise — the safe default. Only `register`,
 * `login` and the health route should carry this.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
