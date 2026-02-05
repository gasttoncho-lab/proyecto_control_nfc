import { IsInt, IsNotEmpty, IsString, IsUUID, Matches, Min } from 'class-validator';

export class BalanceCheckDto {
  @IsUUID('4')
  transactionId: string;

  @IsUUID('4')
  eventId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9a-fA-F]+$/, { message: 'uidHex must be a hex string' })
  uidHex: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9a-fA-F]{32}$/, { message: 'tagIdHex must be 16 bytes hex' })
  tagIdHex: string;

  @IsInt()
  @Min(0)
  ctr: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9a-fA-F]{16}$/, { message: 'sigHex must be 8 bytes hex' })
  sigHex: string;
}
