import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,
    ) { }

    async create(dto: CreatePaymentDto): Promise<Payment> {
        const payment = this.paymentRepository.create({
            orderId: dto.orderId,
            userId: dto.userId,
            amount: dto.amount.toFixed(2),
            currency: dto.currency?.toUpperCase() ?? 'TRY',
            status: PaymentStatus.PENDING,
            failureReason: null,
        });

        return this.paymentRepository.save(payment);
    }
}