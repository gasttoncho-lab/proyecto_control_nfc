import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';

export class InitWristbandDto {
  @IsUUID('4')
  eventId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9a-fA-F]+$/, { message: 'uidHex must be a hex string' })
  uidHex: string;
}
