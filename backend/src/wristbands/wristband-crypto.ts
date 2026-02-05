import { createHmac, timingSafeEqual } from 'crypto';

export const uuidToBytes = (uuid: string): Buffer => {
  const hex = uuid.replace(/-/g, '');
  return Buffer.from(hex, 'hex');
};

export const ctrToBuffer = (ctr: number): Buffer => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(ctr >>> 0);
  return buffer;
};

export const calculateSignature = (secret: Buffer, message: Buffer): Buffer => {
  return createHmac('sha256', secret).update(message).digest().subarray(0, 8);
};

export const timingSafeEqualHex = (aHex: string, bHex: string): boolean => {
  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
};
