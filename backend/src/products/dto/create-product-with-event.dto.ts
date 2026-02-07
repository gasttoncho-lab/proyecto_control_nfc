import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { ProductStatus } from '../entities/product.entity';

export class CreateProductWithEventDto {
  @IsUUID()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsInt()
  @Min(0)
  priceCents: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
