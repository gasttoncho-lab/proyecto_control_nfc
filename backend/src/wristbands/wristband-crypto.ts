import { createHmac, timingSafeEqual } from 'crypto';

export const secretToBuffer = (secret: string | Buffer): Buffer => {
  if (Buffer.isBuffer(secret)) {
    return secret;
  }

  const s = secret.trim();
  const isHex = /^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0;
  if (isHex) {
    return Buffer.from(s, 'hex');
  }

  return Buffer.from(s, 'utf8');
};

export const uuidToBytes = (uuid: string): Buffer => {
  const hex = uuid.replace(/-/g, '');
  return Buffer.from(hex, 'hex');
};

export const ctrToBuffer = (ctr: number): Buffer => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(ctr >>> 0);
  return buffer;
};

export const calculateSignature = (secret: string | Buffer, message: Buffer): Buffer => {
  const key = secretToBuffer(secret);
  return createHmac('sha256', key).update(message).digest().subarray(0, 8);
};

export const timingSafeEqualHex = (aHex: string, bHex: string): boolean => {
  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
};
