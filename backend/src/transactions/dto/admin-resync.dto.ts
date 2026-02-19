import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AdminResyncDto {
  @IsUUID()
  eventId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  targetCtr: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}
