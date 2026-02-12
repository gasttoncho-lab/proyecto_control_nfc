import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class ReportByProductDto {
  @IsOptional()
  @IsUUID('4')
  boothId?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
