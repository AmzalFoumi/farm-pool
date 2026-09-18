import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { IdentityModule } from './identity/identity.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrdersModule } from './orders/orders.module';
import { LogisticsModule } from './logistics/logistics.module';
import { CoordinationModule } from './coordination/coordination.module';

@Module({
  imports: [
    // Cross-cutting first: validated env, then the one database connection.
    AppConfigModule,
    DatabaseModule,
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
