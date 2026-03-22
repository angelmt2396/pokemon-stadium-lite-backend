import { Router } from 'express';

import playerSessionRoutes, {
  createPlayerSessionRouter,
} from '../../modules/players/http/player-session.routes.js';
import pokemonRoutes, { createPokemonRouter } from '../../modules/pokemon/http/pokemon.routes.js';

export const createApiV1Router = (dependencies = {}) => {
  const router = Router();

  router.use(
    '/player-sessions',
    dependencies.playerSessionRouterDependency ??
      createPlayerSessionRouter({
        createOrRefreshSessionDependency: dependencies.createOrRefreshSessionDependency,
        getPlayerSessionDependency: dependencies.getPlayerSessionDependency,
        closePlayerSessionDependency: dependencies.closePlayerSessionDependency,
        authenticatePlayerSessionDependency: dependencies.authenticatePlayerSessionDependency,
      }),
  );

  router.use(
    '/pokemon',
    dependencies.pokemonRouterDependency ??
      createPokemonRouter({
        listPokemonDependency: dependencies.listPokemonDependency,
        getPokemonByIdDependency: dependencies.getPokemonByIdDependency,
      }),
  );

  return router;
};

const router = Router();

router.use('/player-sessions', playerSessionRoutes);
router.use('/pokemon', pokemonRoutes);

export default router;
