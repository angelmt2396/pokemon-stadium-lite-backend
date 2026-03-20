import axios from 'axios';

import { env } from '../../../config/env.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { extractPokemonList, mapPokemonDetail, mapPokemonListItem } from '../mappers/pokemon.mapper.js';

const pokemonApiClient = axios.create({
  baseURL: env.pokemonApiBaseUrl,
  timeout: 10000,
});

export const fetchPokemonList = async () => {
  const response = await pokemonApiClient.get('/list');
  const pokemonList = extractPokemonList(response.data);

  if (!pokemonList.length) {
    throw new AppError('Pokemon list response has an invalid format', 502);
  }

  return pokemonList.map(mapPokemonListItem);
};

export const fetchPokemonById = async (pokemonId) => {
  const response = await pokemonApiClient.get(`/list/${pokemonId}`);
  const pokemon = mapPokemonDetail(response.data);

  if (!pokemon) {
    throw new AppError('Pokemon not found', 404);
  }

  return pokemon;
};
