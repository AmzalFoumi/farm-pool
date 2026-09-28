import {
  requestCallSchema,
  type Call,
  type CallToken,
  type RequestCallData,
} from '@farm-pool/shared';
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../identity/auth/authenticated-request';
import { CurrentUser } from '../identity/auth/current-user.decorator';
import { Allow } from '../identity/auth/roles.decorator';
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe';
import { AnswerCall } from './application/services/answer-call';
import { EndCall } from './application/services/end-call';
import { IssueCallToken } from './application/services/issue-call-token';
import { ListMyCalls } from './application/services/list-my-calls';
import { RequestCall } from './application/services/request-call';

/**
 * HTTP entry points for the calls domain. Thin: validate, call one use-case, return.
 *
 * | Method | Path               | Allow          | Result                                 |
 * | ------ | ------------------ | -------------- | -------------------------------------- |
 * | POST   | /calls             | `call:request` | 201 `Call` · 400 · 404 · 409           |
 * | GET    | /calls/mine        | `call:join`    | 200 `Call[]` (made or received)        |
 * | POST   | /calls/:id/accept  | `call:answer`  | 200 `Call` · 403 · 404 · 409           |
 * | POST   | /calls/:id/decline | `call:answer`  | 200 `Call` · 403 · 404 · 409           |
 * | POST   | /calls/:id/token   | `call:join`    | 200 `CallToken` · 403 · 404 · 409      |
 * | POST   | /calls/:id/end     | `call:join`    | 200 `Call` · 403 · 404 · 409           |
 */
@Controller('calls')
export class CallsController {
  constructor(
    private readonly requestCall: RequestCall,
    private readonly listMyCalls: ListMyCalls,
    private readonly answerCall: AnswerCall,
    private readonly issueCallToken: IssueCallToken,
    private readonly endCall: EndCall,
  ) {}

  @Allow('call:request')
  @Post()
  request(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(requestCallSchema)) body: RequestCallData,
  ): Promise<Call> {
    return this.requestCall.execute(user.sub, body);
  }

  @Allow('call:join')
  @Get('mine')
  mine(@CurrentUser() user: AuthenticatedUser): Promise<Call[]> {
    return this.listMyCalls.execute(user.sub);
  }

  @Allow('call:answer')
  @Post(':id/accept')
  @HttpCode(200)
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Call> {
    return this.answerCall.execute(user.sub, id, 'accept');
  }

  @Allow('call:answer')
  @Post(':id/decline')
  @HttpCode(200)
  decline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Call> {
    return this.answerCall.execute(user.sub, id, 'decline');
  }

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
