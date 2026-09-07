import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IdentityModule } from './identity/identity.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrdersModule } from './orders/orders.module';
import { LogisticsModule } from './logistics/logistics.module';
import { CoordinationModule } from './coordination/coordination.module';

@Module({
  imports: [
    IdentityModule,
    CatalogModule,
    OrdersModule,
    LogisticsModule,
    CoordinationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
