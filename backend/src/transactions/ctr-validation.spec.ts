import { CtrValidationResult, validateCtr } from './ctr-validation';

describe('validateCtr', () => {
  it('returns OK when got equals current', () => {
    expect(validateCtr(9, 9)).toBe(CtrValidationResult.OK);
  });

  it('returns CTR_REPLAY when got is less than current', () => {
    expect(validateCtr(9, 8)).toBe(CtrValidationResult.CTR_REPLAY);
    expect(validateCtr(9, 0)).toBe(CtrValidationResult.CTR_REPLAY);
  });

  it('returns CTR_FORWARD_JUMP when got is greater than current', () => {
    expect(validateCtr(9, 10)).toBe(CtrValidationResult.CTR_FORWARD_JUMP);
    expect(validateCtr(0, 100)).toBe(CtrValidationResult.CTR_FORWARD_JUMP);
  });
});
