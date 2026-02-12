import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Booth } from '../booths/entities/booth.entity';
import { Event } from '../events/entities/event.entity';
import { Product } from '../products/entities/product.entity';
import { TransactionItem } from '../transactions/entities/transaction-item.entity';
import { Transaction, TransactionStatus, TransactionType } from '../transactions/entities/transaction.entity';
import { ListReportTransactionsDto } from './dto/list-report-transactions.dto';
import { ReportByProductDto } from './dto/report-by-product.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    @InjectRepository(TransactionItem)
    private readonly transactionItemsRepository: Repository<TransactionItem>,
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

  async getByProduct(eventId: string, query: ReportByProductDto) {
    await this.ensureEventExists(eventId);

    const qb = this.transactionItemsRepository
      .createQueryBuilder('ti')
      .innerJoin(Transaction, 't', 't.eventId = ti.eventId AND t.id = ti.transactionId')
      .innerJoin(Product, 'p', 'p.id = ti.productId')
      .select('ti.productId', 'productId')
      .addSelect('p.name', 'productName')
      .addSelect('COALESCE(SUM(ti.qty), 0)', 'qtySold')
      .addSelect('COALESCE(SUM(ti.lineTotalCents), 0)', 'totalCents')
      .where('ti.eventId = :eventId', { eventId })
      .andWhere('t.type = :type', { type: TransactionType.CHARGE })
      .andWhere('t.status = :status', { status: TransactionStatus.APPROVED })
      .groupBy('ti.productId')
      .addGroupBy('p.name')
      .orderBy('p.name', 'ASC');

    this.applyProductFilters(qb, query);

    const rows = await qb.getRawMany<{ productId: string; productName: string; qtySold: string; totalCents: string }>();

    return rows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      qtySold: Number(row.qtySold),
      totalCents: Number(row.totalCents),
    }));
  }

  async exportProductsCsv(eventId: string, query: ReportByProductDto) {
    await this.ensureEventExists(eventId);

    if (query.boothId) {
      const qb = this.transactionItemsRepository
        .createQueryBuilder('ti')
        .innerJoin(Transaction, 't', 't.eventId = ti.eventId AND t.id = ti.transactionId')
        .innerJoin(Product, 'p', 'p.id = ti.productId')
        .select('p.name', 'productName')
        .addSelect('COALESCE(SUM(ti.qty), 0)', 'qtySold')
        .addSelect('COALESCE(SUM(ti.lineTotalCents), 0)', 'totalCents')
        .where('ti.eventId = :eventId', { eventId })
        .andWhere('t.type = :type', { type: TransactionType.CHARGE })
        .andWhere('t.status = :status', { status: TransactionStatus.APPROVED })
        .andWhere('ti.boothId = :boothId', { boothId: query.boothId })
        .groupBy('p.name')
        .orderBy('p.name', 'ASC')
        ;

      this.applyProductFilters(qb, query);

      const rows = await qb.getRawMany<{ productName: string; qtySold: string; totalCents: string }>();

      const header = 'productName,qtySold,totalCents';
      const lines = rows.map((row) => [this.escapeCsv(row.productName), Number(row.qtySold), Number(row.totalCents)].join(','));
      return [header, ...lines].join('\n');
    }

    const qb = this.transactionItemsRepository
      .createQueryBuilder('ti')
      .innerJoin(Transaction, 't', 't.eventId = ti.eventId AND t.id = ti.transactionId')
      .innerJoin(Product, 'p', 'p.id = ti.productId')
      .leftJoin(Booth, 'b', 'b.id = ti.boothId')
      .select('COALESCE(b.name, \'\')', 'boothName')
      .addSelect('p.name', 'productName')
      .addSelect('COALESCE(SUM(ti.qty), 0)', 'qtySold')
      .addSelect('COALESCE(SUM(ti.lineTotalCents), 0)', 'totalCents')
      .where('ti.eventId = :eventId', { eventId })
      .andWhere('t.type = :type', { type: TransactionType.CHARGE })
      .andWhere('t.status = :status', { status: TransactionStatus.APPROVED })
      .groupBy('b.name')
      .addGroupBy('p.name')
      .orderBy('b.name', 'ASC')
      .addOrderBy('p.name', 'ASC');

    this.applyProductFilters(qb, query);

    const rows = await qb.getRawMany<{ boothName: string; productName: string; qtySold: string; totalCents: string }>();

    const header = 'boothName,productName,qtySold,totalCents';
    const lines = rows.map((row) =>
      [this.escapeCsv(row.boothName || ''), this.escapeCsv(row.productName), Number(row.qtySold), Number(row.totalCents)].join(','),
    );
    return [header, ...lines].join('\n');
  }

  private applyProductFilters(qb: SelectQueryBuilder<TransactionItem>, query: ReportByProductDto) {
    if (query.boothId) {
      qb.andWhere('ti.boothId = :boothId', { boothId: query.boothId });
    }
    if (query.from) {
      qb.andWhere('t.createdAt >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('t.createdAt <= :to', { to: query.to });
    }
  }

  private escapeCsv(value: string) {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
}
