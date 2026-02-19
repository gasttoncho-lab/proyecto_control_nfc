const { UnprocessableEntityException } = require('@nestjs/common')
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

    return { service, devicesService, transactionsRepository, wristbandsRepository, walletsRepository, dataSource }
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

  it('admin resync permite incrementar ctr', async () => {
    const { service, wristbandsRepository, transactionsRepository } = makeService()
    wristbandsRepository.findOne.mockResolvedValue({ id: 'w-1', eventId: 'e-1', ctrCurrent: 10 })
    wristbandsRepository.save.mockResolvedValue({})
    transactionsRepository.save.mockResolvedValue({})

    const response = await service.adminResync('w-1', { eventId: 'e-1', targetCtr: 12 }, { id: 'admin-1' })
    expect(response).toMatchObject({ code: 'ADMIN_RESYNC', fromCtr: 10, toCtr: 12 })
  })

  it('admin resync con tag atrasado devuelve WRISTBAND_REPLACE_REQUIRED con saldo', async () => {
    const { service, wristbandsRepository, walletsRepository } = makeService()
    wristbandsRepository.findOne.mockResolvedValue({ id: 'w-1', eventId: 'e-1', ctrCurrent: 10 })
    walletsRepository.findOne.mockResolvedValue({ balanceCents: 1250 })

    await expect(service.adminResync('w-1', { eventId: 'e-1', targetCtr: 9 }, { id: 'admin-1' })).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'WRISTBAND_REPLACE_REQUIRED',
        serverCtr: 10,
        tagCtr: 9,
        balanceCents: 1250,
      }),
    })
  })

  it('admin replace transfiere saldo e invalida pulsera anterior', async () => {
    const { service, wristbandsRepository, walletsRepository, dataSource } = makeService()
    const oldWristband = { id: 'w-old', eventId: 'e-1', status: 'ACTIVE', ctrCurrent: 10 }
    const oldWallet = { eventId: 'e-1', wristbandId: 'w-old', balanceCents: 700 }

    wristbandsRepository.findOne.mockResolvedValue(oldWristband)
    walletsRepository.findOne.mockResolvedValue(oldWallet)

    const saved = []
    const manager = {
      findOne: jest.fn(async (entity, options) => {
        if (entity.name === 'Wristband' && options.where.id === 'w-new') {
          return { id: 'w-new', eventId: 'e-1', status: 'ACTIVE' }
        }
        if (entity.name === 'Wallet' && options.where.wristbandId === 'w-new') {
          return { eventId: 'e-1', wristbandId: 'w-new', balanceCents: 100 }
        }
        return null
      }),
      create: jest.fn((_, data) => data),
      save: jest.fn(async (_, data) => {
        saved.push(data)
        return data
      }),
    }
    dataSource.transaction = async (cb) => cb(manager)

    const response = await service.adminReplaceWristband(
      'w-old',
      { eventId: 'e-1', newWristbandId: 'w-new' },
      { id: 'admin-1' },
    )

    expect(response).toMatchObject({
      oldWristbandId: 'w-old',
      newWristbandId: 'w-new',
      transferredCents: 700,
      oldBalanceAfter: 0,
      newBalanceAfter: 800,
    })
    expect(oldWallet.balanceCents).toBe(0)
    expect(saved.some((entry) => entry.status === 'INVALIDATED')).toBe(true)
  })

})
