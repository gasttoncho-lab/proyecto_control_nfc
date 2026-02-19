const { UnprocessableEntityException } = require('@nestjs/common')
const { DevicesService } = require('./dist/devices/devices.service')

describe('DevicesService replacement flow (unit)', () => {
  const makeService = () => {
    const dataSource = { transaction: jest.fn() }
    const devicesRepository = { findOne: jest.fn(), save: jest.fn(), find: jest.fn(), remove: jest.fn() }
    const usersRepository = { findOne: jest.fn() }
    const eventsRepository = { findOne: jest.fn() }
    const boothsRepository = { findOne: jest.fn() }
    const wristbandsRepository = { findOne: jest.fn(), save: jest.fn() }
    const walletsRepository = { findOne: jest.fn(), save: jest.fn() }
    const transactionsRepository = { save: jest.fn() }
    const replaceSessionsRepository = { findOne: jest.fn(), save: jest.fn(), create: jest.fn((x) => x) }

    const service = new DevicesService(
      dataSource,
      devicesRepository,
      usersRepository,
      eventsRepository,
      boothsRepository,
      wristbandsRepository,
      walletsRepository,
      transactionsRepository,
      replaceSessionsRepository,
    )

    return {
      service,
      dataSource,
      devicesRepository,
      wristbandsRepository,
      walletsRepository,
      transactionsRepository,
      replaceSessionsRepository,
    }
  }

  it('finish idempotente no duplica saldo', async () => {
    const { service, dataSource, devicesRepository } = makeService()
    devicesRepository.findOne.mockResolvedValue({ deviceId: 'd-1', userId: 'u-1', eventId: 'e-1', status: 'AUTHORIZED' })
    devicesRepository.save.mockResolvedValue({})

    const session = {
      id: 'rs-1', eventId: 'e-1', oldWristbandId: 'w-old', balanceCentsSnapshot: 500,
      operatorUserId: 'u-1', deviceId: 'd-1', status: 'DONE', newWristbandId: 'w-new', expiresAt: new Date(Date.now()+10000)
    }
    const manager = { findOne: jest.fn(async (entity, opts) => (entity.name === 'ReplaceSession' ? session : null)) }
    dataSource.transaction.mockImplementation(async (cb) => cb(manager))

    const response = await service.replaceFinish({ replaceSessionId: 'rs-1', newTagUidHex: 'AABB' }, 'd-1', { id: 'u-1', email: 'x@y.com' })
    expect(response).toEqual({ newWristbandId: 'w-new', transferredCents: 500, oldWristbandId: 'w-old' })
    expect(manager.findOne).toHaveBeenCalledTimes(1)
  })

  it('session expirada rechaza', async () => {
    const { service, dataSource, devicesRepository } = makeService()
    devicesRepository.findOne.mockResolvedValue({ deviceId: 'd-1', userId: 'u-1', eventId: 'e-1', status: 'AUTHORIZED' })
    devicesRepository.save.mockResolvedValue({})

    const session = {
      id: 'rs-2', eventId: 'e-1', oldWristbandId: 'w-old', balanceCentsSnapshot: 500,
      operatorUserId: 'u-1', deviceId: 'd-1', status: 'PENDING', newWristbandId: null, expiresAt: new Date(Date.now()-1000)
    }
    const manager = { findOne: jest.fn(async (entity) => (entity.name === 'ReplaceSession' ? session : null)) }
    dataSource.transaction.mockImplementation(async (cb) => cb(manager))

    await expect(
      service.replaceFinish({ replaceSessionId: 'rs-2', newTagUidHex: 'AABB' }, 'd-1', { id: 'u-1', email: 'x@y.com' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException)
  })

  it('auditoría transactions crea operatorUserId y deviceId', async () => {
    const { service, dataSource, devicesRepository } = makeService()
    devicesRepository.findOne.mockResolvedValue({ deviceId: 'd-1', userId: 'u-1', eventId: 'e-1', status: 'AUTHORIZED' })
    devicesRepository.save.mockResolvedValue({})

    const session = {
      id: 'rs-3', eventId: 'e-1', oldWristbandId: 'w-old', balanceCentsSnapshot: 500,
      operatorUserId: 'u-1', deviceId: 'd-1', status: 'PENDING', reason: 'TAG atrasado',
      newWristbandId: null, expiresAt: new Date(Date.now()+100000)
    }
    const oldWristband = { id: 'w-old', eventId: 'e-1', status: 'ACTIVE' }
    const oldWallet = { eventId: 'e-1', wristbandId: 'w-old', balanceCents: 500 }
    const newWristband = { id: 'w-new', eventId: 'e-1', status: 'ACTIVE' }
    const newWallet = { eventId: 'e-1', wristbandId: 'w-new', balanceCents: 0 }
    const saved = []

    const manager = {
      findOne: jest.fn(async (entity, opts) => {
        if (entity.name === 'ReplaceSession') return session
        if (entity.name === 'Wristband' && opts.where.id === 'w-old') return oldWristband
        if (entity.name === 'Wristband' && opts.where.uidHex === 'aabb') return newWristband
        if (entity.name === 'Wallet' && opts.where.wristbandId === 'w-old') return oldWallet
        if (entity.name === 'Wallet' && opts.where.wristbandId === 'w-new') return newWallet
        return null
      }),
      save: jest.fn(async (_, payload) => { saved.push(payload); return payload }),
      create: jest.fn((_, payload) => payload),
    }
    dataSource.transaction.mockImplementation(async (cb) => cb(manager))

    await service.replaceFinish({ replaceSessionId: 'rs-3', newTagUidHex: 'AABB' }, 'd-1', { id: 'u-1', email: 'x@y.com' })
    const txRows = saved.filter((x) => x && x.resultJson && String(x.resultJson.code || '').startsWith('REPLACE_TRANSFER_'))
    expect(txRows).toHaveLength(2)
    expect(txRows.every((x) => x.operatorUserId === 'u-1' && x.deviceId === 'd-1')).toBe(true)
  })
})
