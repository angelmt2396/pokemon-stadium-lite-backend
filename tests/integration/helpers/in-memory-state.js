export const runImmediate = async (_key, task) => task();

export const createInMemoryState = () => ({
  sequence: 0,
  players: [],
  lobbies: [],
  battles: [],
});

const nextId = (state, prefix) => `${prefix}-${++state.sequence}`;

const clonePayload = (payload) => structuredClone(payload);

const applyMongoStyleUpdate = (entity, payload) => {
  if (payload.$set) {
    Object.assign(entity, payload.$set);
  }

  if (payload.$unset) {
    for (const key of Object.keys(payload.$unset)) {
      delete entity[key];
    }
  }

  const directPayload = Object.fromEntries(
    Object.entries(payload).filter(([key]) => key !== '$set' && key !== '$unset'),
  );

  Object.assign(entity, directPayload);
};

export const createInMemoryPlayerDependencies = (state) => ({
  createPlayer: async (payload) => {
    const player = {
      id: nextId(state, 'player'),
      nickname: payload.nickname,
      nicknameNormalized: payload.nicknameNormalized ?? payload.nickname.trim().toLowerCase(),
      socketId: payload.socketId ?? null,
      reconnectToken: payload.reconnectToken ?? nextId(state, 'reconnect-token'),
      status: payload.status ?? 'idle',
      sessionStatus: payload.sessionStatus ?? 'closed',
      sessionTokenHash: payload.sessionTokenHash,
      activeLobbyId: payload.activeLobbyId ?? null,
      activeBattleId: payload.activeBattleId ?? null,
      lastSeenAt: payload.lastSeenAt ?? new Date(),
      disconnectedAt: payload.disconnectedAt ?? null,
    };

    state.players.push(player);
    return player;
  },
  registerPlayer: async ({ nickname, socketId }) => {
    const player = {
      id: nextId(state, 'player'),
      nickname: nickname.trim(),
      nicknameNormalized: nickname.trim().toLowerCase(),
      socketId,
      reconnectToken: nextId(state, 'reconnect-token'),
      status: 'idle',
      sessionStatus: 'closed',
      sessionTokenHash: undefined,
      activeLobbyId: null,
      activeBattleId: null,
      lastSeenAt: new Date(),
      disconnectedAt: null,
    };

    state.players.push(player);
    return player;
  },
  findPlayerByNicknameNormalized: async (nicknameNormalized) =>
    state.players.find((player) => player.nicknameNormalized === nicknameNormalized) ?? null,
  findPlayerBySessionTokenHash: async (sessionTokenHash) =>
    state.players.find(
      (player) => player.sessionTokenHash === sessionTokenHash && player.sessionStatus === 'active',
    ) ?? null,
  findPlayerById: async (playerId) => state.players.find((player) => player.id === String(playerId)) ?? null,
  updatePlayerSocket: async (playerId, socketId) => {
    const player = state.players.find((entry) => entry.id === String(playerId)) ?? null;

    if (!player) {
      return null;
    }

    player.socketId = socketId;
    player.lastSeenAt = new Date();
    player.disconnectedAt = null;
    return player;
  },
  updatePlayerState: async (playerId, payload) => {
    const player = state.players.find((entry) => entry.id === String(playerId)) ?? null;

    if (!player) {
      return null;
    }

    applyMongoStyleUpdate(player, payload);
    return player;
  },
  updatePlayersState: async (playerIds, payload) => {
    for (const player of state.players) {
      if (playerIds.some((playerId) => String(playerId) === String(player.id))) {
        applyMongoStyleUpdate(player, payload);
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
