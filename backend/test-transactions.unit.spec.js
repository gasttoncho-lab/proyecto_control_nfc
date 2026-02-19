const { ConflictException, UnprocessableEntityException } = require('@nestjs/common')
const { TransactionsService } = require('./dist/transactions/transactions.service')
const { TransactionStatus, TransactionType } = require('./dist/transactions/entities/transaction.entity')

describe('TransactionsService (unit)', () => {
  const makeService = () => {
    const dataSource = { transaction: jest.fn() }
    const eventsRepository = { findOne: jest.fn() }
    const wristbandsRepository = { findOne: jest.fn(), save: jest.fn() }
    const walletsRepository = { findOne: jest.fn() }
    const transactionsRepository = { findOne: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() }
    const productsRepository = { find: jest.fn() }
    const devicesService = { getAuthorizedDeviceOrThrow: jest.fn() }

    const service = new TransactionsService(
      dataSource,
      eventsRepository,
      wristbandsRepository,
      walletsRepository,
      transactionsRepository,
      productsRepository,
      devicesService,
    )

    return { service, devicesService, transactionsRepository, wristbandsRepository }
  }

  it('persiste DECLINED cuando validateRequest lanza CTR_REPLAY', async () => {
    const { service, devicesService, transactionsRepository } = makeService()
    devicesService.getAuthorizedDeviceOrThrow.mockResolvedValue({ eventId: 'event-1' })
    transactionsRepository.findOne.mockResolvedValue(null)
    jest.spyOn(service, 'validateRequest').mockRejectedValue(
      new UnprocessableEntityException({ code: 'CTR_REPLAY', reason: 'CTR_REPLAY', message: 'CTR_REPLAY', wristbandId: 'w-1' }),
    )

    await expect(
      service.topup({ transactionId: 'tx-1', uidHex: 'aa', tagIdHex: 'bb', ctr: 1, sigHex: 'cc', amountCents: 100 }, 'device-1', {
        id: 'u-1',
        email: 'admin@example.com',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException)

    expect(transactionsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tx-1',
        status: TransactionStatus.DECLINED,
        type: TransactionType.TOPUP,
      }),
    )
  })

  it('admin resync no permite bajar ctr', async () => {
    const { service, wristbandsRepository } = makeService()
    wristbandsRepository.findOne.mockResolvedValue({ id: 'w-1', eventId: 'e-1', ctrCurrent: 10 })
    await expect(service.adminResync('w-1', { eventId: 'e-1', targetCtr: 9 }, { id: 'admin-1' })).rejects.toBeInstanceOf(ConflictException)
  })
})
