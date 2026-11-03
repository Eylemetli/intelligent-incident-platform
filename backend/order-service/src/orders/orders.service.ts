
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Order, OrderStatus } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
    constructor(
        //TypeORM üzerinden orders tablosuna erişiyoruz.
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
    ) { }

    async create(dto: CreateOrderDto): Promise<Order> {
        //Kaydedilecek Order nesnesini hazırlıyoruz.
        const order = this.orderRepository.create({
            userId: dto.userId,
            orderNumber: `ORD-${randomUUID()}`,//Benzersiz sipariş numarası oluşturuyoruz.
            totalAmount: dto.totalAmount.toFixed(2),
            currency: dto.currency?.toUpperCase() ?? 'TRY',
            status: OrderStatus.PENDING,//Siparişin başlangıç durumunu belirliyoruz.
        });
        //save ile Siparişi PostgreSQL'e kaydediyoruz.
        return this.orderRepository.save(order);
    }

    async findAll(): Promise<Order[]> {
        return this.orderRepository.find({
            order: {
                createdAt: 'DESC',
            },
        });
    }

    async findOne(id: string): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id },
        });

        if (!order) {
            throw new NotFoundException('Sipariş bulunamadı');
        }

        return order;
    }

}
