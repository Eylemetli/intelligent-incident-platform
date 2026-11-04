import {
    Body,
    Controller,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import {
    ForbiddenException,
    ParseUUIDPipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { Param, Patch } from '@nestjs/common';
import { ProcessPaymentDto } from './dto/process-payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(
        private readonly paymentsService: PaymentsService,
    ) { }

    @Post()
    create(
        @Body() dto: CreatePaymentDto,
        @Req() request: AuthenticatedRequest,
    ) {
        const token = request.headers.authorization!.split(' ')[1];

        return this.paymentsService.create(
            dto,
            request.user!.sub,
            token,
        );
    }
    @Patch(':id/process')
    process(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ProcessPaymentDto,
        @Req() request: AuthenticatedRequest,
    ) {
        if (
            request.user?.role !== 'admin' &&
            request.user?.role !== 'manager'
        ) {
            throw new ForbiddenException(
                'Ödeme simülasyonu için yetkiniz yok',
            );
        }

        return this.paymentsService.process(
            id,
            request.user.sub,
            dto,
        );
    }
}