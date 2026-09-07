import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';

/**
 * The catalog domain. Wires its three layers together (domain / application /
 * infrastructure). Register providers and repository bindings here as they are added.
 */
@Module({
  controllers: [CatalogController],
  providers: [],
  exports: [],
})
export class CatalogModule {}
