export const runImmediate = async (_key, task) => task();

export const createInMemoryState = () => ({
  sequence: 0,
  players: [],
  lobbies: [],
  battles: [],
});

const nextId = (state, prefix) => `${prefix}-${++state.sequence}`;

const clonePayload = (payload) => structuredClone(payload);

export const createInMemoryPlayerDependencies = (state) => ({
  registerPlayer: async ({ nickname, socketId }) => {
    const player = {
      id: nextId(state, 'player'),
      nickname: nickname.trim(),
      socketId,
      status: 'idle',
      activeLobbyId: null,
    };

    state.players.push(player);
    return player;
  },
  findPlayerById: async (playerId) => state.players.find((player) => player.id === String(playerId)) ?? null,
  updatePlayerSocket: async (playerId, socketId) => {
    const player = state.players.find((entry) => entry.id === String(playerId)) ?? null;

    if (!player) {
      return null;
    }

    player.socketId = socketId;
    return player;
  },
  updatePlayerState: async (playerId, payload) => {
    const player = state.players.find((entry) => entry.id === String(playerId)) ?? null;

    if (!player) {
      return null;
    }

    Object.assign(player, payload);
    return player;
  },
  updatePlayersState: async (playerIds, payload) => {
    for (const player of state.players) {
      if (playerIds.some((playerId) => String(playerId) === String(player.id))) {
        Object.assign(player, payload);
      }
    }

    return {
      acknowledged: true,
    };
  },
});

export const createInMemoryLobbyDependencies = (state) => ({
  createLobby: async (payload) => {
    const lobby = {
      id: nextId(state, 'lobby'),
      ...clonePayload(payload),
    };

    state.lobbies.push(lobby);
    return lobby;
  },
  findLobbyById: async (lobbyId) => state.lobbies.find((lobby) => lobby.id === String(lobbyId)) ?? null,
  findLobbyByPlayerId: async (playerId) =>
    state.lobbies.find((lobby) =>
      lobby.players.some((player) => String(player.playerId) === String(playerId)),
    ) ?? null,
  findCurrentLobby: async () => {
    const activeLobbies = state.lobbies.filter((lobby) => lobby.status !== 'finished');
    return activeLobbies.at(-1) ?? null;
  },
  findWaitingLobby: async () =>
    state.lobbies.find((lobby) => lobby.status === 'waiting' && lobby.players.length < 2) ?? null,
  saveLobby: async (lobby) => lobby,
});

export const createInMemoryBattleDependencies = (state) => ({
  createBattle: async (payload) => {
    const battle = {
      id: nextId(state, 'battle'),
      ...clonePayload(payload),
    };

    state.battles.push(battle);
    return battle;
  },
  findBattleById: async (battleId) => state.battles.find((battle) => battle.id === String(battleId)) ?? null,
  findBattleByLobbyId: async (lobbyId) =>
    [...state.battles].reverse().find((battle) => String(battle.lobbyId) === String(lobbyId)) ?? null,
  saveBattle: async (battle) => battle,
});
