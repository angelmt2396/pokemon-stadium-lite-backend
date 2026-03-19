export const mapPokemonListItem = (pokemon) => ({
  id: pokemon.id,
  name: pokemon.name,
});

export const mapPokemonDetail = (payload) => {
  const pokemon = Array.isArray(payload) ? payload[0] : payload;

  if (!pokemon) {
    return null;
  }

  return {
    id: pokemon.id,
    name: pokemon.name,
    type: Array.isArray(pokemon.type) ? pokemon.type : [],
    hp: pokemon.hp,
    attack: pokemon.attack,
    defense: pokemon.defense,
    speed: pokemon.speed,
  };
};
