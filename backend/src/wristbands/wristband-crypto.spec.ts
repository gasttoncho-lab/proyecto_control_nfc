import { createHmac } from 'crypto';
import {
  calculateSignature,
  ctrToBuffer,
  secretToBuffer,
  timingSafeEqualHex,
  uuidToBytes,
} from './wristband-crypto';

describe('wristband-crypto', () => {
  describe('secretToBuffer', () => {
    it('returns Buffer as-is', () => {
      const buf = Buffer.from([0x01, 0x02]);
      expect(secretToBuffer(buf)).toBe(buf);
    });

    it('parses even-length all-hex string as hex', () => {
      const result = secretToBuffer('deadbeef');
      expect(result).toEqual(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
    });

    it('parses odd-length or non-hex string as utf8', () => {
      const result = secretToBuffer('test-secret');
      expect(result).toEqual(Buffer.from('test-secret', 'utf8'));
    });

    it('trims whitespace before parsing', () => {
      const result = secretToBuffer('  deadbeef  ');
      expect(result).toEqual(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
    });
  });

  describe('uuidToBytes', () => {
    it('converts a UUID to a 16-byte buffer stripping dashes', () => {
      const uuid = 'aabbccdd-eeff-0011-2233-445566778899';
      const result = uuidToBytes(uuid);
      expect(result.length).toBe(16);
      expect(result).toEqual(Buffer.from('aabbccddeeff00112233445566778899', 'hex'));
    });
  });

  describe('ctrToBuffer', () => {
    it('encodes 0 as 4 zero bytes', () => {
      expect(ctrToBuffer(0)).toEqual(Buffer.from([0x00, 0x00, 0x00, 0x00]));
    });

    it('encodes 1 as big-endian uint32', () => {
      expect(ctrToBuffer(1)).toEqual(Buffer.from([0x00, 0x00, 0x00, 0x01]));
    });

    it('encodes 256 correctly', () => {
      expect(ctrToBuffer(256)).toEqual(Buffer.from([0x00, 0x00, 0x01, 0x00]));
    });

    it('encodes 0xFFFFFFFF correctly', () => {
      expect(ctrToBuffer(0xffffffff)).toEqual(Buffer.from([0xff, 0xff, 0xff, 0xff]));
    });
  });

  describe('calculateSignature', () => {
    it('returns 8 bytes (truncated HMAC-SHA256)', () => {
      const secret = 'test-secret';
      const msg = Buffer.from('hello');
      const sig = calculateSignature(secret, msg);
      expect(sig.length).toBe(8);
    });

    it('matches expected HMAC-SHA256 first 8 bytes', () => {
      const secret = 'my-secret';
      const msg = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
      const expected = createHmac('sha256', Buffer.from('my-secret', 'utf8'))
        .update(msg)
        .digest()
        .subarray(0, 8);
      expect(calculateSignature(secret, msg)).toEqual(expected);
    });

    it('produces different output for different secrets', () => {
      const msg = Buffer.from('same-message');
      const sig1 = calculateSignature('secret-a', msg);
      const sig2 = calculateSignature('secret-b', msg);
      expect(sig1.equals(sig2)).toBe(false);
    });

    it('produces different output for different messages', () => {
      const secret = 'same-secret';
      const sig1 = calculateSignature(secret, Buffer.from('msg1'));
      const sig2 = calculateSignature(secret, Buffer.from('msg2'));
      expect(sig1.equals(sig2)).toBe(false);
    });
  });

  describe('timingSafeEqualHex', () => {
    it('returns true for equal hex strings', () => {
      expect(timingSafeEqualHex('deadbeef', 'deadbeef')).toBe(true);
    });

    it('returns false for different hex strings of same length', () => {
      expect(timingSafeEqualHex('deadbeef', 'cafebabe')).toBe(false);
    });

    it('returns false for different lengths', () => {
      expect(timingSafeEqualHex('deadbeef', 'deadbeefff')).toBe(false);
    });

    it('is case-insensitive (hex bytes match regardless of case)', () => {
      expect(timingSafeEqualHex('DEADBEEF', 'deadbeef')).toBe(true);
    });
  });
});
