import axios from 'axios';

import { env } from '../../../config/env.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { mapPokemonDetail, mapPokemonListItem } from '../mappers/pokemon.mapper.js';

const pokemonApiClient = axios.create({
  baseURL: env.pokemonApiBaseUrl,
  timeout: 10000,
});

export const fetchPokemonList = async () => {
  const response = await pokemonApiClient.get('/list');

  return response.data.map(mapPokemonListItem);
};

export const fetchPokemonById = async (pokemonId) => {
  const response = await pokemonApiClient.get(`/list/${pokemonId}`);
  const pokemon = mapPokemonDetail(response.data);

  if (!pokemon) {
    throw new AppError('Pokemon not found', 404);
  }

  return pokemon;
};
