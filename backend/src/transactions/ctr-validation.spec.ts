import { CtrValidationResult, validateCtr } from './ctr-validation';

describe('validateCtr', () => {
  it('returns OK when gotCtr equals currentCtr', () => {
    expect(validateCtr(9, 9)).toBe(CtrValidationResult.OK);
  });

  it('returns CTR_REPLAY when gotCtr is less than currentCtr', () => {
    expect(validateCtr(9, 8)).toBe(CtrValidationResult.CTR_REPLAY);
    expect(validateCtr(9, 0)).toBe(CtrValidationResult.CTR_REPLAY);
  });

  it('returns CTR_FORWARD_JUMP when gotCtr is greater than currentCtr', () => {
    expect(validateCtr(9, 10)).toBe(CtrValidationResult.CTR_FORWARD_JUMP);
    expect(validateCtr(0, 100)).toBe(CtrValidationResult.CTR_FORWARD_JUMP);
  });

  it('handles zero currentCtr correctly', () => {
    expect(validateCtr(0, 0)).toBe(CtrValidationResult.OK);
    expect(validateCtr(0, 1)).toBe(CtrValidationResult.CTR_FORWARD_JUMP);
  });
});
