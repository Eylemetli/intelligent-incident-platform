import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { AuthModule } from '../auth/auth.module';
import { HttpModule } from '@nestjs/axios';
import { IncidentClientModule } from '../incident-client/incident-client.module';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), AuthModule,
  HttpModule.register({
    timeout: 5000,
    maxRedirects: 0,
  }),
    OutboxModule,
    IncidentClientModule,],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule { }