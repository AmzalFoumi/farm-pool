import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogModule } from '../catalog/catalog.module';
import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from '../catalog/domain/repositories/listing.repository';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../identity/domain/repositories/user.repository';
import { IdentityModule } from '../identity/identity.module';
import { AnswerCall } from './application/services/answer-call';
import { EndCall } from './application/services/end-call';
import { IssueCallToken } from './application/services/issue-call-token';
import { ListMyCalls } from './application/services/list-my-calls';
import { RequestCall } from './application/services/request-call';
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

/**
 * The calls domain: who may join which video call. The video itself runs on Agora. Imports
 * `CatalogModule` (the listing names the farmer) and `IdentityModule` (the caller's name). Both
 * dependencies point one way, out of calls.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: CALL_MODEL, schema: CallSchema }]),
    CatalogModule,
    IdentityModule,
  ],
  controllers: [CallsController],
  providers: [
    { provide: CALL_REPOSITORY, useClass: MongooseCallRepository },
    { provide: CALL_TOKEN_SIGNER, useClass: AgoraTokenSigner },
    {
      provide: RequestCall,
      inject: [CALL_REPOSITORY, LISTING_REPOSITORY, USER_REPOSITORY],
      useFactory: (
        calls: CallRepository,
        listings: ListingRepository,
        users: UserRepository,
      ) => new RequestCall(calls, listings, users),
    },
    {
      provide: ListMyCalls,
      inject: [CALL_REPOSITORY],
      useFactory: (calls: CallRepository) => new ListMyCalls(calls),
    },
    {
      provide: AnswerCall,
      inject: [CALL_REPOSITORY],
      useFactory: (calls: CallRepository) => new AnswerCall(calls),
    },
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
