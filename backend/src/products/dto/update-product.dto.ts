import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ProductStatus } from '../entities/product.entity';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
