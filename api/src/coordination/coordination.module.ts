import { Module } from '@nestjs/common';
import { CoordinationController } from './coordination.controller';

/**
 * The coordination domain. Wires its three layers together (domain / application /
 * infrastructure). Register providers and repository bindings here as they are added.
 */
@Module({
  controllers: [CoordinationController],
  providers: [],
  exports: [],
})
export class CoordinationModule {}
