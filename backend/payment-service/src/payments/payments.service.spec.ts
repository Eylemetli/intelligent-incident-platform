
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AxiosError, AxiosHeaders } from 'axios';
import { of, throwError } from 'rxjs';

import { PaymentsService } from './payments.service';
import { Payment, PaymentStatus } from './entities/payment.entity';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const orderId = '550e8400-e29b-41d4-a716-446655440001';
  const token = 'test-token';

  const dto = {
    orderId,
    amount: 250,
    currency: 'TRY',
  };

  const order = {
    id: orderId,
    userId,
    totalAmount: '250.00',
    currency: 'TRY',
    status: 'confirmed',
  };

  const payment = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    orderId,
    userId,
    amount: '250.00',
    currency: 'TRY',
    status: PaymentStatus.PENDING,
    failureReason: null,
  };

  const repository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const httpService = {
    get: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn(),
  };

  const mockOrderResponse = (data: unknown) => {
    httpService.get.mockReturnValue(
      of({ data, status: 200, statusText: 'OK', headers: {}, config: {} }),
    );
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          PaymentsService,
          {
            provide: getRepositoryToken(Payment),
            useValue: repository,
          },
          {
            provide: HttpService,
            useValue: httpService,
          },
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

    service = module.get<PaymentsService>(PaymentsService);

    configService.getOrThrow.mockReturnValue(
      'http://localhost:3002',
    );

    repository.create.mockReturnValue(payment);
    repository.save.mockResolvedValue(payment);
  });

  it('PaymentsService tanımlanmalı', () => {
    expect(service).toBeDefined();
  });

  it('onaylanmış sipariş için ödeme oluşturmalı', async () => {
    mockOrderResponse(order);

    const result = await service.create(dto, userId, token);

    expect(httpService.get).toHaveBeenCalledWith(
      `http://localhost:3002/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    expect(repository.create).toHaveBeenCalledWith({
      orderId,
      userId,
      amount: '250.00',
      currency: 'TRY',
      status: PaymentStatus.PENDING,
      failureReason: null,
    });

    expect(repository.save).toHaveBeenCalled();
    expect(result).toEqual(payment);
  });

  it('onaylanmamış siparişi reddetmeli', async () => {
    mockOrderResponse({
      ...order,
      status: 'pending',
    });

    await expect(
      service.create(dto, userId, token),
    ).rejects.toThrow(ConflictException);

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('yanlış ödeme tutarını reddetmeli', async () => {
    mockOrderResponse(order);

    await expect(
      service.create(
        { ...dto, amount: 100 },
        userId,
        token,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('farklı para birimini reddetmeli', async () => {
    mockOrderResponse(order);

    await expect(
      service.create(
        { ...dto, currency: 'USD' },
        userId,
        token,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('başkasının siparişini reddetmeli', async () => {
    mockOrderResponse({
      ...order,
      userId: '550e8400-e29b-41d4-a716-446655440099',
    });

    await expect(
      service.create(dto, userId, token),
    ).rejects.toThrow(NotFoundException);

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('Order Service 404 dönerse NotFoundException fırlatmalı', async () => {
    const error = new AxiosError(
      'Not Found',
      'ERR_BAD_RESPONSE',
      { headers: new AxiosHeaders() },
      {},
      {
        data: {},
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: { headers: new AxiosHeaders() },
      },
    );

    httpService.get.mockReturnValue(
      throwError(() => error),
    );

    await expect(
      service.create(dto, userId, token),
    ).rejects.toThrow(NotFoundException);
  });

  it('Order Service erişilemezse 503 fırlatmalı', async () => {
    httpService.get.mockReturnValue(
      throwError(() => new Error('Connection refused')),
    );

    await expect(
      service.create(dto, userId, token),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(repository.save).not.toHaveBeenCalled();
  });
});
