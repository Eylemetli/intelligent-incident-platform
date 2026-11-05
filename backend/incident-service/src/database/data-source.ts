import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Incident } from '../incidents/entities/incident.entity';

export default new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [Incident],
    migrations: ['src/database/migrations/*.ts'],
    synchronize: false,
});