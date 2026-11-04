
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './entities/order.entity';

describe('OrdersService', () => {
    let service: OrdersService;

    const repository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
    };

    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const orderId = '550e8400-e29b-41d4-a716-446655440001';

    const makeOrder = (
        overrides: Partial<Order> = {},
    ): Order =>
        ({
            id: orderId,
            userId,
            orderNumber: 'ORD-TEST',
            totalAmount: '250.00',
            currency: 'TRY',
            status: OrderStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...overrides,
        }) as Order;

    beforeEach(async () => {
        jest.resetAllMocks();

        const module: TestingModule =
            await Test.createTestingModule({
                providers: [
                    OrdersService,
                    {
                        provide: getRepositoryToken(Order),
                        useValue: repository,
                    },
                ],
            }).compile();

        service = module.get<OrdersService>(OrdersService);
    });

    describe('create', () => {
        it('sipariş oluşturmalı', async () => {
            const dto = {
                totalAmount: 250,
                currency: 'TRY',
            };

            const order = makeOrder();

            repository.create.mockReturnValue(order);
            repository.save.mockResolvedValue(order);

            const result = await service.create(dto, userId);

            expect(repository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId,
                    totalAmount: '250.00',
                    currency: 'TRY',
                    status: OrderStatus.PENDING,
                    orderNumber: expect.stringMatching(/^ORD-/),
                }),
            );

            expect(repository.save).toHaveBeenCalledWith(order);
            expect(result).toEqual(order);
        });
    });

    describe('findAll', () => {
        it('yalnızca kullanıcının siparişlerini getirmeli', async () => {
            const orders = [makeOrder()];

            repository.find.mockResolvedValue(orders);

            const result = await service.findAll(userId);

            expect(repository.find).toHaveBeenCalledWith({
                where: { userId },
                order: { createdAt: 'DESC' },
            });

            expect(result).toEqual(orders);
        });
    });

    describe('findOne', () => {
        it('kullanıcının siparişini getirmeli', async () => {
            const order = makeOrder();

            repository.findOne.mockResolvedValue(order);

            const result = await service.findOne(orderId, userId);

            expect(repository.findOne).toHaveBeenCalledWith({
                where: { id: orderId, userId },
            });

            expect(result).toEqual(order);
        });

        it('sipariş bulunamazsa 404 fırlatmalı', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(
                service.findOne(orderId, userId),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('cancel', () => {
        it('pending siparişi iptal etmeli', async () => {
            const order = makeOrder();

            repository.findOne.mockResolvedValue(order);
            repository.save.mockImplementation(async (value) => value);

            const result = await service.cancel(orderId, userId);

            expect(result.status).toBe(OrderStatus.CANCELLED);
            expect(repository.save).toHaveBeenCalled();
        });

        it('paid siparişi iptal etmemeli', async () => {
            const order = makeOrder({
                status: OrderStatus.PAID,
            });

            repository.findOne.mockResolvedValue(order);

            await expect(
                service.cancel(orderId, userId),
            ).rejects.toThrow(ConflictException);

            expect(repository.save).not.toHaveBeenCalled();
        });
    });

    describe('confirm', () => {
        it('pending siparişi onaylamalı', async () => {
            const order = makeOrder();

            repository.findOne.mockResolvedValue(order);
            repository.save.mockImplementation(async (value) => value);

            const result = await service.confirm(orderId, userId);

            expect(result.status).toBe(OrderStatus.CONFIRMED);
        });

        it('cancelled siparişi onaylamamalı', async () => {
            const order = makeOrder({
                status: OrderStatus.CANCELLED,
            });

            repository.findOne.mockResolvedValue(order);

            await expect(
                service.confirm(orderId, userId),
            ).rejects.toThrow(ConflictException);

            expect(repository.save).not.toHaveBeenCalled();
        });

        it('başkasının siparişini onaylamamalı', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(
                service.confirm(orderId, userId),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
