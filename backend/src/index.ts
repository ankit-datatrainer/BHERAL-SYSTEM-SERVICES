/**
 * Bheral Systems & Services — Express API entrypoint.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { env } from './env.js';
import { pingDatabase } from './supabase.js';
import { catalogRouter } from './routes/catalog.js';
import { requestsRouter } from './routes/requests.js';
import { marketplaceRouter } from './routes/marketplace.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '256kb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(
  cors({
    origin: env.corsOrigins.includes('*') ? true : env.corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  }),
);

/** Liveness + database reachability, used by the frontend banner and by CI. */
app.get('/api/health', async (_req, res) => {
  const db = await pingDatabase();
  res.status(db.ok ? 200 : 503).json({
    status: db.ok ? 'ok' : 'degraded',
    database: db.ok ? 'connected' : 'unreachable',
    error: db.error,
    usingServiceRole: env.usingServiceRole,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', catalogRouter);
app.use('/api', requestsRouter);
app.use('/api', marketplaceRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  console.log(`[api] listening on http://localhost:${env.PORT}`);
  console.log(`[api] supabase: ${env.SUPABASE_URL}`);
  console.log(`[api] credential: ${env.usingServiceRole ? 'service role' : 'publishable/anon key (RLS enforced)'}`);
});

// Let nodemon/tsx and container orchestrators shut us down cleanly.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`\n[api] ${signal} received, closing server`);
    server.close(() => process.exit(0));
  });
}

export { app };
