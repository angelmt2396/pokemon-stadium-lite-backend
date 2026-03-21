export const SOCKET_EVENTS = {
  CLIENT: {
    SEARCH_MATCH: 'search_match',
    CANCEL_SEARCH: 'cancel_search',
    RECONNECT_PLAYER: 'reconnect_player',
    ASSIGN_POKEMON: 'assign_pokemon',
    READY: 'ready',
    ATTACK: 'attack',
  },
  SERVER: {
    SEARCH_STATUS: 'search_status',
    MATCH_FOUND: 'match_found',
    LOBBY_STATUS: 'lobby_status',
    BATTLE_START: 'battle_start',
    TURN_RESULT: 'turn_result',
    BATTLE_END: 'battle_end',
  },
};
