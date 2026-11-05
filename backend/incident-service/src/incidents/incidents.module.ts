import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Incident } from './entities/incident.entity';
import { IncidentsController } from './incidents.controller';
import { InternalIncidentsController } from './internal-incidents.controller';
import { IncidentsService } from './incidents.service';
import { AuthModule } from '../auth/auth.module';
import { InternalServiceGuard } from '../auth/guards/internal-service.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Incident]),
    AuthModule,
  ],
  controllers: [
    IncidentsController,
    InternalIncidentsController,
  ],
  providers: [
    IncidentsService,
    InternalServiceGuard,
  ],
})
export class IncidentsModule { }