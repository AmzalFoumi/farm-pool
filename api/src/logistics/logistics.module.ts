import { Module } from '@nestjs/common';
import { LogisticsController } from './logistics.controller';

/**
 * The logistics domain. Wires its three layers together (domain / application /
 * infrastructure). Register providers and repository bindings here as they are added.
 */
@Module({
  controllers: [LogisticsController],
  providers: [],
  exports: [],
})
export class LogisticsModule {}
