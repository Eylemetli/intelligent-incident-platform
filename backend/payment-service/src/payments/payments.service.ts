import {
    Injectable,
    BadRequestException,
    ConflictException,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { Repository } from 'typeorm';

import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrderResponse } from './interfaces/order-response.interface';

@Injectable()
export class PaymentsService {
    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    async create(
        dto: CreatePaymentDto,
        userId: string,
        token: string,
    ): Promise<Payment> {
        const order = await this.getOrder(dto.orderId, token);

        if (order.userId !== userId) {
            throw new NotFoundException('Sipariş bulunamadı');
        }

        if (order.status !== 'confirmed') {
            throw new ConflictException(
                'Yalnızca onaylanmış siparişler için ödeme oluşturulabilir',
            );
        }

        const amount = dto.amount.toFixed(2);
        const currency = dto.currency?.toUpperCase() ?? 'TRY';

        if (
            Number(order.totalAmount) !== Number(amount) ||
            order.currency !== currency
        ) {
            throw new BadRequestException(
                'Ödeme tutarı veya para birimi siparişle uyuşmuyor',
            );
        }

        const payment = this.paymentRepository.create({
            orderId: order.id,
            userId,
            amount,
            currency,
            status: PaymentStatus.PENDING,
            failureReason: null,
        });

        return this.paymentRepository.save(payment);
    }

    private async getOrder(
        orderId: string,
        token: string,
    ): Promise<OrderResponse> {
        const baseUrl =
            this.configService.getOrThrow<string>('ORDER_SERVICE_URL');

        try {
            const response = await firstValueFrom(
                this.httpService.get<OrderResponse>(
                    `${baseUrl}/orders/${orderId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    },
                ),
            );

            return response.data;
        } catch (error: unknown) {
            if (error instanceof AxiosError) {
                if (error.response?.status === 401) {
                    throw new ServiceUnavailableException(
                        'Sipariş servisi kimlik doğrulaması başarısız',
                    );
                }

                if (error.response?.status === 404) {
                    throw new NotFoundException('Sipariş bulunamadı');
                }
            }

            throw new ServiceUnavailableException(
                'Order Service ile iletişim kurulamadı',
            );
        }
    }
}