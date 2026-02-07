import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { BoothStatus } from '../entities/booth.entity';

export class UpdateBoothDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEnum(BoothStatus)
  status?: BoothStatus;
}
