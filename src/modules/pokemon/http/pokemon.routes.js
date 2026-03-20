import { Router } from 'express';

import { createPokemonController } from './pokemon.controller.js';

export const createPokemonRouter = (dependencies = {}) => {
  const router = Router();
  const { getPokemonDetail, getPokemonList } = createPokemonController(dependencies);

  router.get('/', getPokemonList);
  router.get('/:id', getPokemonDetail);

  return router;
};

const router = createPokemonRouter();

export default router;
