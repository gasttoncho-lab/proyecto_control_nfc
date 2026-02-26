import { createHmac } from 'crypto';
import {
  calculateSignature,
  ctrToBuffer,
  secretToBuffer,
  timingSafeEqualHex,
  uuidToBytes,
} from './wristband-crypto';

describe('secretToBuffer', () => {
  it('returns the same buffer when input is already a Buffer', () => {
    const buf = Buffer.from('deadbeef', 'hex');
    expect(secretToBuffer(buf)).toBe(buf);
  });

  it('decodes an even-length hex string as hex', () => {
    expect(secretToBuffer('deadbeef')).toEqual(Buffer.from('deadbeef', 'hex'));
  });

  it('decodes a non-hex string as utf8', () => {
    expect(secretToBuffer('my-secret')).toEqual(Buffer.from('my-secret', 'utf8'));
  });

  it('trims whitespace before deciding encoding', () => {
    expect(secretToBuffer('  deadbeef  ')).toEqual(Buffer.from('deadbeef', 'hex'));
  });

  it('treats odd-length hex-looking string as utf8', () => {
    // 'abc' is 3 chars — odd length, so not valid hex → utf8
    expect(secretToBuffer('abc')).toEqual(Buffer.from('abc', 'utf8'));
  });
});

describe('uuidToBytes', () => {
  it('converts a UUID to a 16-byte buffer without dashes', () => {
    const uuid = '12345678-1234-1234-1234-123456789abc';
    const result = uuidToBytes(uuid);
    expect(result.length).toBe(16);
    expect(result).toEqual(Buffer.from('12345678123412341234123456789abc', 'hex'));
  });
});

describe('ctrToBuffer', () => {
  it('encodes 0 as 4 zero bytes', () => {
    expect(ctrToBuffer(0)).toEqual(Buffer.from([0, 0, 0, 0]));
  });

  it('encodes 1 as big-endian uint32', () => {
    expect(ctrToBuffer(1)).toEqual(Buffer.from([0, 0, 0, 1]));
  });

  it('encodes 256 correctly', () => {
    expect(ctrToBuffer(256)).toEqual(Buffer.from([0, 0, 1, 0]));
  });

  it('encodes 0xDEADBEEF correctly', () => {
    expect(ctrToBuffer(0xdeadbeef >>> 0)).toEqual(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
  });
});

describe('calculateSignature', () => {
  it('returns the first 8 bytes of HMAC-SHA256', () => {
    const key = Buffer.from('secret', 'utf8');
    const msg = Buffer.from('hello');
    const result = calculateSignature(key, msg);

    const expected = createHmac('sha256', key).update(msg).digest().subarray(0, 8);
    expect(result).toEqual(expected);
    expect(result.length).toBe(8);
  });

  it('produces deterministic output for the same inputs', () => {
    const key = Buffer.from('deadbeef', 'hex');
    const msg = Buffer.from('aabbccdd1122334400000005', 'hex');
    const r1 = calculateSignature(key, msg);
    const r2 = calculateSignature(key, msg);
    expect(r1).toEqual(r2);
  });

  it('accepts a hex string secret via secretToBuffer', () => {
    const result = calculateSignature('deadbeef', Buffer.from('test'));
    expect(result.length).toBe(8);
  });
});

describe('timingSafeEqualHex', () => {
  it('returns true for identical hex strings', () => {
    expect(timingSafeEqualHex('aabbccdd', 'aabbccdd')).toBe(true);
  });

  it('returns false for different hex strings of same length', () => {
    expect(timingSafeEqualHex('aabbccdd', 'aabbcc00')).toBe(false);
  });

  it('returns false for hex strings of different lengths', () => {
    expect(timingSafeEqualHex('aabb', 'aabbccdd')).toBe(false);
  });

  it('returns false for empty vs non-empty', () => {
    expect(timingSafeEqualHex('', 'aabb')).toBe(false);
  });

  it('returns true for two empty strings', () => {
    expect(timingSafeEqualHex('', '')).toBe(true);
  });
});
