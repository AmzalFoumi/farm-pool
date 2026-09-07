import { Module } from '@nestjs/common';
import { IdentityController } from './identity.controller';

/**
 * The identity domain. Wires its three layers together (domain / application /
 * infrastructure). Register providers and repository bindings here as they are added.
 */
@Module({
  controllers: [IdentityController],
  providers: [],
  exports: [],
})
export class IdentityModule {}
