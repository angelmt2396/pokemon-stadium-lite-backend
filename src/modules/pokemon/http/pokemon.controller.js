import { asyncHandler } from '../../../shared/utils/async-handler.js';
import { getPokemonById, listPokemon } from '../services/pokemon.service.js';

export const getPokemonList = asyncHandler(async (_request, response) => {
  const pokemon = await listPokemon();

  response.json(pokemon);
});

export const getPokemonDetail = asyncHandler(async (request, response) => {
  const pokemon = await getPokemonById(request.params.id);

  response.json(pokemon);
});
