import { IsHexadecimal, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class ReplaceFinishDto {
  @IsUUID()
  replaceSessionId: string;

  @IsString()
  @IsNotEmpty()
  @IsHexadecimal()
  @MaxLength(64)
  newTagUidHex: string;
}
