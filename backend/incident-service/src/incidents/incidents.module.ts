import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Incident } from './entities/incident.entity';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Incident]),
    AuthModule,
  ],
  controllers: [IncidentsController],
  providers: [IncidentsService],
})
export class IncidentsModule { }