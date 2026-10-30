import { Hono } from 'hono';
import { isNight } from './digest/night.js';
import { readNight } from './digest/read.js';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/api/digest/:night', (c) => {
    const night = c.req.param('night');
    const digest = isNight(night) ? readNight(config.runsDir, night) : null;
    if (digest === null || !digest.found) {
      return c.json({ error: `no runs for ${night}` }, 404);
    }
    return c.json({ night: digest.night, rows: digest.rows, badLines: digest.badLines });
  });

  return app;
}
