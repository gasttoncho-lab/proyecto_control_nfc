import { IsBoolean, IsUUID } from 'class-validator';

export class BoothProductAssignmentDto {
  @IsUUID()
  productId: string;

  @IsBoolean()
  enabled: boolean;
}
