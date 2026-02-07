import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateBoothWithEventDto {
  @IsUUID()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
