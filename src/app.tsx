import { Hono } from 'hono';
import { isNight } from './digest/night.js';
import { readNight } from './digest/read.js';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestNotFound, DigestPage } from './views/digest.js';
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

  // Page and JSON read the same rows from the same reader, so they can't disagree (ADR 0001).
  // Parse at the edge: only a real YYYY-MM-DD ever reaches the filesystem.
  app.get('/digest/:night', (c) => {
    const night = c.req.param('night');
    const digest = isNight(night) ? readNight(config.runsDir, night) : null;
    if (digest === null || !digest.found) {
      return c.html(
        <Layout title={`digest ${night}`} lane={lane()}>
          <DigestNotFound night={night} />
        </Layout>,
        404,
      );
    }
    return c.html(
      <Layout title={`digest ${night}`} lane={lane()}>
        <DigestPage night={night} rows={digest.rows} badLines={digest.badLines} />
      </Layout>,
    );
  });

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
