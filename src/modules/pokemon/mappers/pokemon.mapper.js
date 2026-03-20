export const extractPokemonList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
};

export const mapPokemonListItem = (pokemon) => ({
  id: pokemon.id,
  name: pokemon.name,
  sprite: pokemon.sprite,
});

export const mapPokemonDetail = (payload) => {
  const pokemon = Array.isArray(payload)
    ? payload[0]
    : Array.isArray(payload?.data)
      ? payload.data[0]
      : payload?.data
        ? payload.data
      : payload;

  if (!pokemon) {
    return null;
  }

  return {
    id: pokemon.id,
    name: pokemon.name,
    sprite: pokemon.sprite,
    type: Array.isArray(pokemon.type) ? pokemon.type : [],
    hp: pokemon.hp ?? null,
    attack: pokemon.attack ?? null,
    defense: pokemon.defense ?? null,
    speed: pokemon.speed ?? null,
  };
};
