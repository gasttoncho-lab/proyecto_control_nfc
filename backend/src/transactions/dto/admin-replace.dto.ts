import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class AdminReplaceDto {
  @IsUUID()
  eventId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  newWristbandId?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  newTagUid?: string;

  @IsOptional()
  newTagPayload?: Record<string, unknown>;
}
