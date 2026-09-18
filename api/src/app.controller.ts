import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './identity/auth/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Health check. Public: a phone or a load balancer must be able to hit it without a token. */
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
