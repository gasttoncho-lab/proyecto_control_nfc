import { IsNotEmpty, IsString } from 'class-validator';

export class RevokeDeviceDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;
}
