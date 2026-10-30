import assert from 'node:assert/strict';
import { safeReturnTo } from '../../../src/lib/authRedirect.ts';
assert.equal(safeReturnTo('/assessment?campaignId=12'), '/assessment?campaignId=12');
for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/login', '/register', '/\n/evil.test', null]) {
  assert.equal(safeReturnTo(value), '/dashboard');
}

assert.equal(safeReturnTo('/filipevm/assessment?campaignId=12'), '/assessment?campaignId=12');
assert.equal(safeReturnTo('/filipevm/login'), '/dashboard');
