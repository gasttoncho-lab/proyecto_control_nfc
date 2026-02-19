import { strict as assert } from 'node:assert';
import { CtrValidationResult, validateCtr } from './ctr-validation';

assert.equal(validateCtr(7, 8), CtrValidationResult.OK, 'got == expected should be OK');
assert.equal(validateCtr(7, 7), CtrValidationResult.CTR_REPLAY, 'got == ctrCurrent should be replay');
assert.equal(validateCtr(7, 6), CtrValidationResult.CTR_REPLAY, 'got < ctrCurrent should be replay');
assert.equal(validateCtr(7, 9), CtrValidationResult.CTR_FORWARD_JUMP, 'got > expected should be forward jump');

console.log('ctr-validation.spec passed');
