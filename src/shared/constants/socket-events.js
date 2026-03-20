export const SOCKET_EVENTS = {
  CLIENT: {
    JOIN_LOBBY: 'join_lobby',
    RECONNECT_PLAYER: 'reconnect_player',
    ASSIGN_POKEMON: 'assign_pokemon',
    READY: 'ready',
    ATTACK: 'attack',
  },
  SERVER: {
    LOBBY_STATUS: 'lobby_status',
    BATTLE_START: 'battle_start',
    TURN_RESULT: 'turn_result',
    BATTLE_END: 'battle_end',
  },
};
