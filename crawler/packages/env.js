import { existsSync, readFileSync } from 'node:fs';

const file = new URL('../.env', import.meta.url).pathname;
if (existsSync(file)) {
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const key = line.slice(0, line.indexOf('=')).trim();
    const value = line.slice(line.indexOf('=') + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
