import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class ReplaceStartDto {
  @IsUUID()
  eventId: string;

  @IsUUID()
  oldWristbandId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;
}
