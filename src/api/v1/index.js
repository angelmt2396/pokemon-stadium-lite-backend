import { Router } from 'express';

import pokemonRoutes, { createPokemonRouter } from '../../modules/pokemon/http/pokemon.routes.js';

export const createApiV1Router = (dependencies = {}) => {
  const router = Router();

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

router.use('/pokemon', pokemonRoutes);

export default router;
