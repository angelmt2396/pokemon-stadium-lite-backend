import { asyncHandler } from '../../../shared/utils/async-handler.js';
import { buildSuccessResponse } from '../../../shared/utils/api-response.js';
import { getPokemonById, listPokemon } from '../services/pokemon.service.js';

export const getPokemonList = asyncHandler(async (_request, response) => {
  const pokemon = await listPokemon();

  response.json(
    buildSuccessResponse({
      data: pokemon,
      meta: {
        total: pokemon.length,
      },
    }),
  );
});

export const getPokemonDetail = asyncHandler(async (request, response) => {
  const pokemon = await getPokemonById(request.params.id);

  response.json(
    buildSuccessResponse({
      data: pokemon,
    }),
  );
});
