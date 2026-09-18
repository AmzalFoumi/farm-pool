import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { USER_REPOSITORY } from './domain/repositories/user.repository';
import { IdentityController } from './identity.controller';
import { MongooseUserRepository } from './infrastructure/persistence/mongoose-user.repository';
import {
  USER_MODEL,
  UserSchema,
} from './infrastructure/persistence/user.schema';

/**
 * The identity domain. Wires its three layers together (domain / application /
 * infrastructure): the `users` collection is registered here, and the `UserRepository`
 * interface is bound to its Mongoose implementation. Use-cases ask for `USER_REPOSITORY` and
 * never learn which store answers.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: USER_MODEL, schema: UserSchema }]),
  ],
  controllers: [IdentityController],
  providers: [{ provide: USER_REPOSITORY, useClass: MongooseUserRepository }],
  exports: [USER_REPOSITORY],
})
export class IdentityModule {}
