import { Module } from '@nestjs/common';

import { FrontendModule } from './modules/frontend/frontend.module';
import { ApiModule } from './modules/api/api.module';
import { JaegerModule } from './modules/jaeger/jaeger.module';

@Module({
  imports: [ApiModule, FrontendModule, JaegerModule],
})
export class AppModule {}
