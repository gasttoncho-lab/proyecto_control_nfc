import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AdminInvalidateDto {
  @IsUUID()
  eventId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
