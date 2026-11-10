import Redis from 'ioredis';

function memoryRedis() {
  const data = new Map();
  const now = () => Date.now();
  const alive = (item) => item && (!item.expiresAt || item.expiresAt > now());
  return {
    kind: 'memory',
    async setNx(key, value, ttlMs) {
      const item = data.get(key);
      if (alive(item)) return false;
      data.set(key, { value, expiresAt: ttlMs ? now() + ttlMs : 0 });
      return true;
    },
    async get(key) {
      const item = data.get(key);
      if (!alive(item)) {
        data.delete(key);
        return null;
      }
      return item.value;
    },
    async setEx(key, value, ttlMs) {
      data.set(key, { value, expiresAt: ttlMs ? now() + ttlMs : 0 });
    },
    async del(key) {
      data.delete(key);
    },
    async incrWindow(key, ttlMs) {
      const item = data.get(key);
      const count = alive(item) ? Number(item.value) + 1 : 1;
      data.set(key, { value: String(count), expiresAt: alive(item) ? item.expiresAt : now() + ttlMs });
      return count;
    },
    async close() {},
  };
}

function realRedis(url) {
  const client = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: false });
  return {
    kind: 'redis',
    async setNx(key, value, ttlMs) {
      const result = await client.set(key, value, 'PX', ttlMs, 'NX');
      return result === 'OK';
    },
    async get(key) {
      return client.get(key);
    },
    async setEx(key, value, ttlMs) {
      await client.set(key, value, 'PX', ttlMs);
    },
    async del(key) {
      await client.del(key);
    },
    async incrWindow(key, ttlMs) {
      const value = await client.incr(key);
      if (value === 1) await client.pexpire(key, ttlMs);
      return value;
    },
    async close() {
      await client.quit();
    },
  };
}

let singleton = null;

export function redis() {
  if (singleton) return singleton;
  const url = process.env.REDIS_URL || '';
  singleton = url ? realRedis(url) : memoryRedis();
  return singleton;
}
