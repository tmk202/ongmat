import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL = '';
process.env.REDIS_URL = '';
process.env.ACCOUNT_RPM = '100';

const { registerMemoryAccount, leaseAccount, releaseAccount, cooldownAccount } = await import('../packages/accounts.js');

test('lease one account at a time and rotate', async () => {
  const a = registerMemoryAccount({ label: 'a1', cookie: 'SPC_F=1', market: 'VN' });
  const b = registerMemoryAccount({ label: 'a2', cookie: 'SPC_F=2', market: 'VN' });
  const first = await leaseAccount({ market: 'VN' });
  const second = await leaseAccount({ market: 'VN' });
  assert.ok(first);
  assert.ok(second);
  assert.notEqual(first.id, second.id);
  await releaseAccount(first);
  await releaseAccount(second);
  assert.ok([a.id, b.id].includes(first.id));
});

test('cooldown removes an account from rotation', async () => {
  const a = registerMemoryAccount({ label: 'b1', cookie: 'SPC_F=3', market: 'VN' });
  await cooldownAccount(a, 5, 'test');
  const lease = await leaseAccount({ market: 'VN' });
  assert.notEqual(lease?.id, a.id);
});
