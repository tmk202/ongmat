import { dev } from 'astro';

const server = await dev({
  root: process.cwd(),
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});

// Keep the foreground dev server process alive indefinitely for AI Studio preview
setInterval(() => {}, 1 << 30);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    try {
      await server.stop();
    } catch {
      // ignore shutdown error
    }
    process.exit(0);
  });
}
