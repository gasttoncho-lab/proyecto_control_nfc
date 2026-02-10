import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booth } from '../booths/entities/booth.entity';
import { Event } from '../events/entities/event.entity';
import { Transaction, TransactionStatus, TransactionType } from '../transactions/entities/transaction.entity';
import { ListReportTransactionsDto } from './dto/list-report-transactions.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>
  ) {}

  private async ensureEventExists(eventId: string) {
    const event = await this.eventsRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  async getEventSummary(eventId: string) {
    await this.ensureEventExists(eventId);

    const raw = await this.transactionsRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(CASE WHEN t.status = :approved THEN t.amountCents ELSE 0 END), 0)', 'totalCents')
      .addSelect('COALESCE(SUM(CASE WHEN t.status = :approved THEN 1 ELSE 0 END), 0)', 'chargesApproved')
      .addSelect('COALESCE(SUM(CASE WHEN t.status = :declined THEN 1 ELSE 0 END), 0)', 'chargesDeclined')
      .addSelect('COUNT(*)', 'chargesTotal')
      .where('t.eventId = :eventId', { eventId })
      .andWhere('t.type = :type', { type: TransactionType.CHARGE })
      .setParameters({ approved: TransactionStatus.APPROVED, declined: TransactionStatus.DECLINED })
      .getRawOne<{ totalCents: string; chargesApproved: string; chargesDeclined: string; chargesTotal: string }>();

    return {
      eventId,
      totalCents: Number(raw?.totalCents ?? 0),
      chargesApproved: Number(raw?.chargesApproved ?? 0),
      chargesDeclined: Number(raw?.chargesDeclined ?? 0),
      chargesTotal: Number(raw?.chargesTotal ?? 0),
    };
  }

  async getByBooth(eventId: string) {
    await this.ensureEventExists(eventId);

    const rows = await this.transactionsRepository
      .createQueryBuilder('t')
      .innerJoin(Booth, 'b', 'b.id = t.boothId')
      .select('t.boothId', 'boothId')
      .addSelect('b.name', 'boothName')
      .addSelect('COALESCE(SUM(t.amountCents), 0)', 'totalCents')
      .addSelect('COUNT(*)', 'chargesCount')
      .where('t.eventId = :eventId', { eventId })
      .andWhere('t.type = :type', { type: TransactionType.CHARGE })
      .andWhere('t.status = :status', { status: TransactionStatus.APPROVED })
      .groupBy('t.boothId')
      .addGroupBy('b.name')
      .orderBy('b.name', 'ASC')
      .getRawMany<{ boothId: string; boothName: string; totalCents: string; chargesCount: string }>();

    return rows.map((row) => ({
      boothId: row.boothId,
      boothName: row.boothName,
      totalCents: Number(row.totalCents),
      chargesCount: Number(row.chargesCount),
    }));
  }

  async getTransactions(eventId: string, query: ListReportTransactionsDto) {
    await this.ensureEventExists(eventId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const fromDate = query.from ? new Date(query.from) : null;
    const toDate = query.to ? new Date(query.to) : null;

    const qb = this.transactionsRepository
      .createQueryBuilder('t')
      .select(['t.id AS id', 't.boothId AS boothId', 't.amountCents AS amountCents', 't.status AS status', 't.createdAt AS createdAt'])
      .where('t.eventId = :eventId', { eventId })
      .andWhere('t.type = :type', { type: TransactionType.CHARGE });

    if (query.boothId) {
      qb.andWhere('t.boothId = :boothId', { boothId: query.boothId });
    }
    if (fromDate) {
      qb.andWhere('t.createdAt >= :from', { from: fromDate.toISOString() });
    }
    if (toDate) {
      qb.andWhere('t.createdAt <= :to', { to: toDate.toISOString() });
    }

    const total = await qb.getCount();

    const rows = await qb
      .orderBy('t.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ id: string; boothId: string; amountCents: string; status: TransactionStatus; createdAt: string }>();

    return {
      page,
      limit,
      total,
      items: rows.map((row) => ({
        id: row.id,
        boothId: row.boothId,
        amountCents: Number(row.amountCents),
        status: row.status,
        createdAt: row.createdAt,
      })),
    };
  }

  async exportApprovedCsv(eventId: string) {
    await this.ensureEventExists(eventId);

    const rows = await this.transactionsRepository
      .createQueryBuilder('t')
      .leftJoin(Booth, 'b', 'b.id = t.boothId')
      .select('t.createdAt', 'createdAt')
      .addSelect('b.name', 'boothName')
      .addSelect('t.amountCents', 'amountCents')
      .where('t.eventId = :eventId', { eventId })
      .andWhere('t.type = :type', { type: TransactionType.CHARGE })
      .andWhere('t.status = :status', { status: TransactionStatus.APPROVED })
      .orderBy('t.createdAt', 'DESC')
      .getRawMany<{ createdAt: string; boothName: string | null; amountCents: string }>();

    const header = 'createdAt,boothName,amountCents';
    const lines = rows.map((row) => [row.createdAt, this.escapeCsv(row.boothName ?? ''), Number(row.amountCents)].join(','));
    return [header, ...lines].join('\n');
  }

  private escapeCsv(value: string) {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
}
