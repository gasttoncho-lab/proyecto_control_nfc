import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Booth } from './booths/entities/booth.entity';
import { Event } from './events/entities/event.entity';
import { Product } from './products/entities/product.entity';

export const AppDataSource = new DataSource({
  type: 'mariadb',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER || 'app',
  password: process.env.DB_PASSWORD || 'app_password',
  database: process.env.DB_NAME || 'control_nfc',
  entities: [Event, Booth, Product],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
});
