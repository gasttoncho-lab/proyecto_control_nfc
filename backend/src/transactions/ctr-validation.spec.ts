import { strict as assert } from 'node:assert';
import { CtrValidationResult, validateCtr } from './ctr-validation';

assert.equal(validateCtr(9, 9), CtrValidationResult.OK, 'got == ctrCurrent should be OK');
assert.equal(validateCtr(9, 8), CtrValidationResult.CTR_REPLAY, 'got < ctrCurrent should be replay');
assert.equal(validateCtr(9, 10), CtrValidationResult.CTR_FORWARD_JUMP, 'got > ctrCurrent should be forward jump');

console.log('ctr-validation.spec passed');
