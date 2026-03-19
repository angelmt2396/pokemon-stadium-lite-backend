import { fetchPokemonById, fetchPokemonList } from '../repositories/pokemon.repository.js';

export const listPokemon = async () => fetchPokemonList();

export const getPokemonById = async (pokemonId) => fetchPokemonById(pokemonId);
