import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AdminRefundDto {
  @IsUUID()
  eventId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
