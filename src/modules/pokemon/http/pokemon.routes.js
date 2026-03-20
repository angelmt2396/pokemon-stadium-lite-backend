import { Router } from 'express';

import { validateRequest } from '../../../shared/validation/http-validation.js';
import { pokemonIdParamsSchema } from '../../../shared/validation/schemas.js';
import { createPokemonController } from './pokemon.controller.js';

export const createPokemonRouter = (dependencies = {}) => {
  const router = Router();
  const { getPokemonDetail, getPokemonList } = createPokemonController(dependencies);

  router.get('/', getPokemonList);
  router.get('/:id', validateRequest({ params: pokemonIdParamsSchema }), getPokemonDetail);

  return router;
};

const router = createPokemonRouter();

export default router;
