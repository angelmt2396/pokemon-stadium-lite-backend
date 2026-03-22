import { Router } from 'express';

import { createRequirePlayerSessionMiddleware } from '../../../shared/auth/session-auth.js';
import { validateRequest } from '../../../shared/validation/http-validation.js';
import { playerSessionBodySchema } from '../../../shared/validation/schemas.js';
import { createPlayerSessionController } from './player-session.controller.js';

export const createPlayerSessionRouter = (dependencies = {}) => {
  const router = Router();
  const requirePlayerSession = createRequirePlayerSessionMiddleware({
    authenticatePlayerSessionDependency: dependencies.authenticatePlayerSessionDependency,
  });
  const { createSession, getCurrentSession, deleteCurrentSession } = createPlayerSessionController(
    dependencies,
  );

  router.post('/', validateRequest({ body: playerSessionBodySchema }), createSession);
  router.get('/me', requirePlayerSession, getCurrentSession);
  router.delete('/me', requirePlayerSession, deleteCurrentSession);

  return router;
};

const router = createPlayerSessionRouter();

export default router;
