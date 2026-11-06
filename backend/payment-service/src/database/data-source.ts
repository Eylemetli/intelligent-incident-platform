import 'dotenv/config';
import { DataSource } from 'typeorm';

import { Payment } from '../payments/entities/payment.entity';
import { OutboxEvent } from '../outbox/entities/outbox-event.entity';

export default new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [Payment, OutboxEvent],
    migrations: ['src/database/migrations/*.ts'],
    synchronize: false,
});