import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { Booth, BoothStatus } from '../src/booths/entities/booth.entity';
import { DeviceAuthorization, DeviceMode, DeviceStatus } from '../src/devices/entities/device-authorization.entity';
import { Event, EventStatus } from '../src/events/entities/event.entity';
import { Product, ProductStatus } from '../src/products/entities/product.entity';
import { Transaction } from '../src/transactions/entities/transaction.entity';
import { TransactionsService } from '../src/transactions/transactions.service';
import { UserEntity } from '../src/users/entities/user.entity';
import { Wallet } from '../src/wallets/entities/wallet.entity';
import { Wristband, WristbandStatus } from '../src/wristbands/entities/wristband.entity';
import { calculateSignature, ctrToBuffer, uuidToBytes } from '../src/wristbands/wristband-crypto';

const buildSignature = (secret: Buffer, uidHex: string, tagIdHex: string, ctr: number, eventId: string) => {
  const uidBytes = Buffer.from(uidHex, 'hex');
  const tagIdBytes = Buffer.from(tagIdHex, 'hex');
  const ctrBytes = ctrToBuffer(ctr);
  const eventIdBytes = uuidToBytes(eventId);
  const msg = Buffer.concat([uidBytes, tagIdBytes, ctrBytes, eventIdBytes]);
  return calculateSignature(secret, msg).toString('hex');
};

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const dataSource = app.get(DataSource);

  const eventsRepository = dataSource.getRepository(Event);
  const boothsRepository = dataSource.getRepository(Booth);
  const usersRepository = dataSource.getRepository(UserEntity);
  const devicesRepository = dataSource.getRepository(DeviceAuthorization);
  const wristbandsRepository = dataSource.getRepository(Wristband);
  const walletsRepository = dataSource.getRepository(Wallet);
  const productsRepository = dataSource.getRepository(Product);
  const transactionsRepository = dataSource.getRepository(Transaction);
  const transactionsService = app.get(TransactionsService);

  const created = {
    userId: '' as string,
    eventId: '' as string,
    boothId: '' as string,
    deviceId: '' as string,
    productId: '' as string,
    wristbandId: '' as string,
    walletId: '' as string,
    transactionId: '' as string,
  };
  try {
    const user = await usersRepository.save(
      usersRepository.create({
        email: `money-e2e-${randomUUID()}@example.com`,
        password: 'hashed',
        name: 'Money E2E',
      }),
    );
    created.userId = user.id;

    const event = await eventsRepository.save(
      eventsRepository.create({
        name: 'Money E2E Event',
        status: EventStatus.OPEN,
        hmacSecret: Buffer.alloc(32, 1),
      }),
    );
    created.eventId = event.id;

    const booth = await boothsRepository.save(
      boothsRepository.create({
        eventId: event.id,
        name: 'Main Booth',
        status: BoothStatus.ACTIVE,
      }),
    );
    created.boothId = booth.id;

    const deviceId = `e2e-device-${randomUUID()}`;
    created.deviceId = deviceId;
    await devicesRepository.save(
      devicesRepository.create({
        deviceId,
        userId: user.id,
        eventId: event.id,
        boothId: booth.id,
        mode: DeviceMode.CHARGE,
        status: DeviceStatus.AUTHORIZED,
      }),
    );

    const product = await productsRepository.save(
      productsRepository.create({
        eventId: event.id,
        name: 'E2E Product',
        priceCents: 2500,
        status: ProductStatus.ACTIVE,
      }),
    );
    created.productId = product.id;

    const wristband = await wristbandsRepository.save(
      wristbandsRepository.create({
        eventId: event.id,
        uidHex: 'a1b2c3d4',
        tagIdHex: '0'.repeat(32),
        ctrCurrent: 0,
        status: WristbandStatus.ACTIVE,
      }),
    );
    created.wristbandId = wristband.id;

    const wallet = await walletsRepository.save(
      walletsRepository.create({
        eventId: event.id,
        wristbandId: wristband.id,
        balanceCents: 8300,
      }),
    );
    created.walletId = wallet.id;

    const transactionId = randomUUID();
    created.transactionId = transactionId;
    const sigHex = buildSignature(event.hmacSecret, wristband.uidHex, wristband.tagIdHex, 0, event.id);

    const prepareResult = await transactionsService.chargePrepare(
      {
        transactionId,
        uidHex: wristband.uidHex,
        tagIdHex: wristband.tagIdHex,
        ctr: 0,
        sigHex,
        items: [{ productId: product.id, qty: 1 }],
      },
      deviceId,
      { id: user.id, email: user.email },
      'e2e-charge-trace',
    );

    if (prepareResult.status !== 'PENDING') {
      throw new Error(`Expected PENDING, got ${prepareResult.status}`);
    }

    const commitResult = await transactionsService.chargeCommit(
      { transactionId },
      deviceId,
      { id: user.id, email: user.email },
      'e2e-charge-trace',
    );

    if (commitResult.status !== 'APPROVED') {
      throw new Error(`Expected APPROVED, got ${commitResult.status}`);
    }

    const updatedWallet = await walletsRepository.findOneOrFail({
      where: { eventId: event.id, wristbandId: wristband.id },
    });

    if (updatedWallet.balanceCents !== 5800) {
      throw new Error(`Expected balance 5800, got ${updatedWallet.balanceCents}`);
    }

    const transaction = await transactionsRepository.findOneOrFail({ where: { id: transactionId } });
    if (transaction.amountCents !== 2500) {
      throw new Error(`Expected transaction amount 2500, got ${transaction.amountCents}`);
    }

    console.log('✅ Money charge e2e passed');
  } finally {
    if (created.transactionId) {
      await transactionsRepository.delete({ id: created.transactionId });
    }
    if (created.walletId) {
      await walletsRepository.delete({ id: created.walletId });
    }
    if (created.wristbandId) {
      await wristbandsRepository.delete({ id: created.wristbandId });
    }
    if (created.productId) {
      await productsRepository.delete({ id: created.productId });
    }
    if (created.deviceId) {
      await devicesRepository.delete({ deviceId: created.deviceId });
    }
    if (created.boothId) {
      await boothsRepository.delete({ id: created.boothId });
    }
    if (created.eventId) {
      await eventsRepository.delete({ id: created.eventId });
    }
    if (created.userId) {
      await usersRepository.delete({ id: created.userId });
    }
    await app.close();
  }
}

run().catch((error) => {
  console.error('❌ Money charge e2e failed', error);
  process.exit(1);
});
