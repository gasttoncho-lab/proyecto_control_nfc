export enum CtrValidationResult {
  OK = 'OK',
  CTR_REPLAY = 'CTR_REPLAY',
  CTR_FORWARD_JUMP = 'CTR_FORWARD_JUMP',
}

export function validateCtr(currentCtr: number, gotCtr: number): CtrValidationResult {
  const expectedCtr = currentCtr + 1;
  if (gotCtr === expectedCtr) {
    return CtrValidationResult.OK;
  }
  if (gotCtr <= currentCtr) {
    return CtrValidationResult.CTR_REPLAY;
  }
  return CtrValidationResult.CTR_FORWARD_JUMP;
}
