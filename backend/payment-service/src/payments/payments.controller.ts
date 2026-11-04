import {
    Body,
    Controller,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

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
}