import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';

export class TopupDto {
  @IsUUID('4')
  transactionId: string;

  @IsOptional()
  @IsUUID('4')
  eventId?: string;

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

  @IsInt()
  @Min(1)
  amountCents: number;
}
