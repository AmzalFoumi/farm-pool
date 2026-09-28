import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EndCall } from './application/services/end-call';
import { IssueCallToken } from './application/services/issue-call-token';
import { CallsController } from './calls.controller';
import {
  CALL_REPOSITORY,
  type CallRepository,
} from './domain/repositories/call.repository';
import {
  CALL_TOKEN_SIGNER,
  type CallTokenSigner,
} from './domain/services/call-token-signer';
import { AgoraTokenSigner } from './infrastructure/agora/agora-token-signer';
import {
  CALL_MODEL,
  CallSchema,
} from './infrastructure/persistence/call.schema';
import { MongooseCallRepository } from './infrastructure/persistence/mongoose-call.repository';

/** The calls domain: who may join which video call. The video itself runs on Agora. */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: CALL_MODEL, schema: CallSchema }]),
  ],
  controllers: [CallsController],
  providers: [
    { provide: CALL_REPOSITORY, useClass: MongooseCallRepository },
    { provide: CALL_TOKEN_SIGNER, useClass: AgoraTokenSigner },
    {
      provide: IssueCallToken,
      inject: [CALL_REPOSITORY, CALL_TOKEN_SIGNER],
      useFactory: (calls: CallRepository, signer: CallTokenSigner) =>
        new IssueCallToken(calls, signer),
    },
    {
      provide: EndCall,
      inject: [CALL_REPOSITORY],
      useFactory: (calls: CallRepository) => new EndCall(calls),
    },
  ],
})
export class CallsModule {}
