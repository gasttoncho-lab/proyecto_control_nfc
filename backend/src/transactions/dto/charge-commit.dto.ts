import { IsUUID } from 'class-validator';

export class ChargeCommitDto {
  @IsUUID('4')
  transactionId: string;
}
