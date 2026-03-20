import { asyncHandler } from '../../../shared/utils/async-handler.js';
import { buildSuccessResponse } from '../../../shared/utils/api-response.js';
import { getPokemonById, listPokemon } from '../services/pokemon.service.js';

export const createPokemonController = (dependencies = {}) => {
  const {
    listPokemonDependency = listPokemon,
    getPokemonByIdDependency = getPokemonById,
  } = dependencies;

  const getPokemonList = asyncHandler(async (_request, response) => {
    const pokemon = await listPokemonDependency();

    response.json(
      buildSuccessResponse({
        data: pokemon,
        meta: {
          total: pokemon.length,
        },
      }),
    );
  });

  const getPokemonDetail = asyncHandler(async (request, response) => {
    const pokemon = await getPokemonByIdDependency(request.params.id);

    response.json(
      buildSuccessResponse({
        data: pokemon,
      }),
    );
  });

  return {
    getPokemonList,
    getPokemonDetail,
  };
};

export const { getPokemonList, getPokemonDetail } = createPokemonController();
