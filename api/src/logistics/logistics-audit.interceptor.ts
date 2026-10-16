import {
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { tap, type Observable } from 'rxjs';
import type { AuthenticatedRequest } from '../identity/auth/authenticated-request';
import { DomainError } from '../shared/kernel/domain-error';

/**
 * One log line per logistics request: who acted, on which job, what happened.
 *
 * It exists because a delivery is the one part of this app with a physical counterpart. When a
 * farmer says nobody came for the tomatoes, or two drivers each believe they hold the same order,
 * or a load shows 95 kg against a 100 kg deal, the database only holds the *current* state — it
 * cannot say who accepted at what time or which of them was refused `job_taken`. This is the
 * record that can.
 *
 * It is an interceptor rather than `logger.log` scattered through the use-cases for two reasons.
 * The use-cases are plain classes with no `@nestjs/*` import — that is what lets them be unit
 * tested with the in-memory repositories and nothing else — and a rule enforced in one place
 * cannot be forgotten by the next endpoint added to the controller.
 *
 * **Writes are logged at `log`, reads at `debug`.** The board is polled; logging every poll at
 * info level would bury the three lines that matter. **Refusals are logged at `warn` with their
 * code**, because `job_taken` and `window_clash` are exactly the events worth counting later.
 *
 * What is deliberately *not* logged: the request body beyond the two numbers below, and anything
 * from the response. A `JobDetail` carries the farmer's phone number once the job is held, and a
 * log file is a far easier thing to leak than the database.
 */
@Injectable()
export class LogisticsAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Logistics');

  /** The handlers that change something. Everything else on the controller is a read. */
  private static readonly WRITES = new Set(['accept', 'pickup', 'deliver']);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const action = context.getHandler().name;
    const isWrite = LogisticsAuditInterceptor.WRITES.has(action);
    const started = Date.now();

    /* `actor`, not `driver`: the assigned-driver endpoint is called by the farmer or the buyer. */
    const what = [
      action,
      `actor=${request.user?.sub ?? 'anonymous'}`,
      request.params?.orderId
        ? `order=${String(request.params.orderId)}`
        : undefined,
      detail(action, request.body),
    ]
      .filter(Boolean)
      .join(' ');

    return next.handle().pipe(
      tap({
        next: () => {
          const line = `${what} → ok ${Date.now() - started}ms`;
          if (isWrite) this.logger.log(line);
          else this.logger.debug(line);
        },
        error: (error: unknown) => {
          const elapsed = `${Date.now() - started}ms`;
          if (error instanceof DomainError) {
            this.logger.warn(
              `${what} → refused ${error.kind}/${error.code} ${elapsed}`,
            );
            return;
          }
          /* Unexpected: a repository that threw, a bug. Keep the stack — nothing else will. */
          this.logger.error(`${what} → failed ${elapsed}`, error);
        },
      }),
    );
  }
}

/**
 * The one or two body fields worth keeping per action — what the driver *promised* and what they
 * *loaded*. Both are numbers a dispute turns on, and neither identifies anybody.
 *
 * Read defensively: the interceptor runs before `ZodValidationPipe`, so the body here is whatever
 * was sent, not a parsed `AcceptJobData`.
 */
function detail(action: string, body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const fields = body as Record<string, unknown>;

  if (action === 'accept') {
    const window = fields.committedWindow;
    if (typeof window !== 'object' || window === null) return 'window=none';
    const { from, to } = window as Record<string, unknown>;
    return `window=${String(from)}-${String(to)}`;
  }

  if (action === 'pickup') return `collectedKg=${String(fields.collectedKg)}`;

  return undefined;
}
