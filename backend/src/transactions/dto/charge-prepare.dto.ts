import { ArrayNotEmpty, IsInt, IsNotEmpty, IsString, IsUUID, Matches, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ChargeItemDto {
  @IsUUID('4')
  productId: string;

  @IsInt()
  @Min(1)
  qty: number;
}

export class ChargePrepareDto {
  @IsUUID('4')
  transactionId: string;

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

  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ChargeItemDto)
  items: ChargeItemDto[];
}
