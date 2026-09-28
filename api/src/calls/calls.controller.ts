import type { Call, CallToken } from '@farm-pool/shared';
import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../identity/auth/authenticated-request';
import { CurrentUser } from '../identity/auth/current-user.decorator';
import { Allow } from '../identity/auth/roles.decorator';
import { EndCall } from './application/services/end-call';
import { IssueCallToken } from './application/services/issue-call-token';

/**
 * HTTP entry points for the calls domain. Thin: call one use-case, return.
 *
 * | Method | Path             | Allow       | Result                                      |
 * | ------ | ---------------- | ----------- | ------------------------------------------- |
 * | POST   | /calls/:id/token | `call:join` | 200 `CallToken` · 403 · 404 · 409           |
 * | POST   | /calls/:id/end   | `call:join` | 200 `Call` · 403 · 404 · 409                |
 */
@Controller('calls')
export class CallsController {
  constructor(
    private readonly issueCallToken: IssueCallToken,
    private readonly endCall: EndCall,
  ) {}

  @Allow('call:join')
  @Post(':id/token')
  @HttpCode(200)
  token(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<CallToken> {
    return this.issueCallToken.execute(user.sub, id);
  }

  @Allow('call:join')
  @Post(':id/end')
  @HttpCode(200)
  end(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Call> {
    return this.endCall.execute(user.sub, id);
  }
}
