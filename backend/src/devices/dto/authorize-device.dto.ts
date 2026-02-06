import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { DeviceMode } from '../entities/device-authorization.entity';

export class AuthorizeDeviceDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsUUID('4')
  userId: string;

  @IsUUID('4')
  eventId: string;

  @IsEnum(DeviceMode)
  mode: DeviceMode;

  @IsOptional()
  @IsUUID('4')
  boothId?: string;
}
