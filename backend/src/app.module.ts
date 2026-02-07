import 'dotenv/config';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { Event } from './events/entities/event.entity';
import { Booth } from './booths/entities/booth.entity';
import { Product } from './products/entities/product.entity';
import { Wristband } from './wristbands/entities/wristband.entity';
import { Wallet } from './wallets/entities/wallet.entity';
import { Transaction } from './transactions/entities/transaction.entity';
import { UserEntity } from './users/entities/user.entity';
import { DeviceAuthorization } from './devices/entities/device-authorization.entity';
import { EventsModule } from './events/events.module';
import { BoothsModule } from './booths/booths.module';
import { ProductsModule } from './products/products.module';
import { WristbandsModule } from './wristbands/wristbands.module';
import { TransactionsModule } from './transactions/transactions.module';
import { DevicesModule } from './devices/devices.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '24h' },
    }),
    TypeOrmModule.forRoot({
      type: 'mariadb',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      username: process.env.DB_USER || 'app',
      password: process.env.DB_PASSWORD || 'app_password',
      database: process.env.DB_NAME || 'control_nfc',
      entities: [Event, Booth, Product, Wristband, Wallet, Transaction, UserEntity, DeviceAuthorization],
      synchronize: false,
    }),
    TypeOrmModule.forFeature([UserEntity]),
    EventsModule,
    BoothsModule,
    ProductsModule,
    WristbandsModule,
    TransactionsModule,
    DevicesModule,
  ],
  controllers: [AuthController, UsersController],
  providers: [AuthService, UsersService, JwtStrategy],
})
export class AppModule {}
