const express = require('express');
const path = require('node:path');

const COOKIE_NAME = 'datrack_session';
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function success(res, data, status = 200) {
  return res.status(status).json({ data });
}

function failure(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function parseCookie(header = '') {
  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === COOKIE_NAME) return decodeURIComponent(value.join('='));
  }
  return null;
}

function maskedMsisdn(msisdn) {
  return `${'•'.repeat(Math.max(0, msisdn.length - 4))}${msisdn.slice(-4)}`;
}

function createApp({ config, auth, store, refreshService, staticDir }) {
  const app = express();
  const expectedOrigin = `http://${config.host}:${config.port}`;
  app.disable('x-powered-by');

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.use('/api', (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    if (!req.is('application/json')) {
      return failure(res, 415, 'UNSUPPORTED_MEDIA_TYPE', 'State-changing requests must use JSON.');
    }
    if (req.headers.origin && req.headers.origin !== expectedOrigin) {
      return failure(res, 403, 'INVALID_ORIGIN', 'Request origin is not allowed.');
    }
    return next();
  });

  app.use('/api', express.json({ limit: '16kb' }));

  function token(req) {
    return parseCookie(req.headers.cookie);
  }

  function authenticated(req, res, next) {
    const session = auth.getSession(token(req));
    if (!session) return failure(res, 401, 'UNAUTHENTICATED', 'Authentication required.');
    req.session = session;
    return next();
  }

  function adminOnly(req, res, next) {
    try {
      req.session = auth.requireRole(token(req), 'admin');
      return next();
    } catch (error) {
      return failure(res, error.status || 500, error.code || 'INTERNAL_ERROR', error.message);
    }
  }

  app.get('/api/health', (_req, res) => success(res, { status: 'ready' }));

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const result = await auth.login(req.body?.username, req.body?.password);
      if (!result) return failure(res, 401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
      res.cookie(COOKIE_NAME, result.token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: false,
        path: '/',
        maxAge: SESSION_MAX_AGE_MS,
      });
      return success(res, result.session);
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    auth.logout(token(req));
    res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'strict', path: '/' });
    return success(res, { signedOut: true });
  });

  app.get('/api/auth/session', authenticated, (req, res) => success(res, req.session));

  app.get('/api/sims', authenticated, async (req, res, next) => {
    try {
      let sims = await store.list();
      if (req.session.role === 'reader') {
        sims = sims.map((sim) => ({ ...sim, msisdn: maskedMsisdn(sim.msisdn) }));
      }
      return success(res, sims);
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/sims', adminOnly, async (req, res, next) => {
    try {
      return success(res, await store.add(req.body || {}), 201);
    } catch (error) {
      return next(error);
    }
  });

  app.delete('/api/sims/:id', adminOnly, async (req, res, next) => {
    try {
      const removed = await store.remove(req.params.id);
      if (!removed) return failure(res, 404, 'SIM_NOT_FOUND', 'SIM not found.');
      return success(res, { removed: true });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/sims/:id/refresh', adminOnly, async (req, res, next) => {
    try {
      return success(res, await refreshService.refreshOne(req.params.id));
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/sims/refresh', adminOnly, async (_req, res, next) => {
    try {
      return success(res, await refreshService.refreshAll());
    } catch (error) {
      return next(error);
    }
  });

  app.use('/api', (_req, res) => failure(res, 404, 'NOT_FOUND', 'API route not found.'));

  if (staticDir) {
    app.use(express.static(staticDir, { index: false }));
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      return res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  app.use((error, _req, res, _next) => {
    if (error?.type === 'entity.parse.failed') {
      return failure(res, 400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }
    if (error?.code === 'DUPLICATE_MSISDN') {
      return failure(res, 409, error.code, error.message);
    }
    if (error?.code === 'SIM_NOT_FOUND') {
      return failure(res, 404, error.code, 'SIM not found.');
    }
    if (error?.status && error?.code) {
      return failure(res, error.status, error.code, error.message);
    }
    if (/required|Nigerian|80 characters/i.test(error?.message || '')) {
      return failure(res, 400, 'INVALID_INPUT', error.message);
    }
    return failure(res, 500, 'INTERNAL_ERROR', 'The local service could not complete the request.');
  });

  return app;
}

module.exports = { createApp, maskedMsisdn };
