/**
 * Central error plumbing: a typed HttpError, an async route wrapper so
 * rejected promises reach Express, plus 404 and error handlers.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Wraps an async handler so a rejected promise becomes `next(err)`. */
export const asyncRoute =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    handler(req, res, next).catch(next);
  };

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  console.error('[api] unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
