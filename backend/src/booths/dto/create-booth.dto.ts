import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateBoothDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
