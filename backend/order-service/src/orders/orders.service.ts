
import { Injectable, NotFoundException, ConflictException, } from '@nestjs/common';
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

    async create(dto: CreateOrderDto, userId: string): Promise<Order> {
        //Kaydedilecek Order nesnesini hazırlıyoruz.
        const order = this.orderRepository.create({
            userId: userId,
            orderNumber: `ORD-${randomUUID()}`,//Benzersiz sipariş numarası oluşturuyoruz.
            totalAmount: dto.totalAmount.toFixed(2),
            currency: dto.currency?.toUpperCase() ?? 'TRY',
            status: OrderStatus.PENDING,//Siparişin başlangıç durumunu belirliyoruz.
        });
        //save ile Siparişi PostgreSQL'e kaydediyoruz.
        return this.orderRepository.save(order);
    }


    async findAll(userId: string): Promise<Order[]> {
        return this.orderRepository.find({
            where: { userId },
            order: {
                createdAt: 'DESC',
            },
        });
    }

    async findOne(id: string, userId: string): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: {
                id,
                userId,
            },
        });

        if (!order) {
            throw new NotFoundException('Sipariş bulunamadı');
        }

        return order;
    }

    async cancel(id: string, userId: string): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: {
                id,
                userId,
            },
        });

        if (!order) {
            throw new NotFoundException('Sipariş bulunamadı');
        }

        if (
            order.status !== OrderStatus.PENDING &&
            order.status !== OrderStatus.CONFIRMED
        ) {
            throw new ConflictException(
                'Bu durumdaki sipariş iptal edilemez',
            );
        }

        order.status = OrderStatus.CANCELLED;

        return this.orderRepository.save(order);
    }
    //Bu metot siparişin hem kullanıcıya ait olduğunu hem de pending durumunda bulunduğunu kontrol ediyor.
    async confirm(id: string, userId: string): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: {
                id,
                userId,
            },
        });

        if (!order) {
            throw new NotFoundException('Sipariş bulunamadı');
        }

        if (order.status !== OrderStatus.PENDING) {
            throw new ConflictException(
                'Yalnızca bekleyen siparişler onaylanabilir',
            );
        }

        order.status = OrderStatus.CONFIRMED;

        return this.orderRepository.save(order);
    }


}
