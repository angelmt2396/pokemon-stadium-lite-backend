import { BATTLE_STATUS } from '../../../shared/constants/battle-status.js';
import { LOBBY_STATUS } from '../../../shared/constants/lobby-status.js';
import { PLAYER_STATUS } from '../../../shared/constants/player-status.js';
import { SESSION_STATUS } from '../../../shared/constants/session-status.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { runSerialized } from '../../../shared/utils/serial-executor.js';
import { findLobbyById, saveLobby } from '../../lobby/repositories/lobby.repository.js';
import { createBattle, findBattleById, findBattleByLobbyId, saveBattle } from '../repositories/battle.repository.js';
import { findPlayerById, updatePlayerState, updatePlayersState } from '../../players/repositories/player.repository.js';
import { getPokemonById } from '../../pokemon/services/pokemon.service.js';
import { calculateDamage, applyDamage } from './damage.service.js';
import { resolveFirstTurn } from './turn.service.js';

const toPlayerId = (playerId) => String(playerId);
const battleLockKey = (battleId) => `battle:${battleId}`;
const DISCONNECT_GRACE_PERIOD_MS = 15_000;
const BATTLE_FINISH_REASONS = {
  HP_DEPLETED: 'hp_depleted',
  DISCONNECT_TIMEOUT: 'disconnect_timeout',
};

const createBattlePokemon = (pokemon) => ({
  pokemonId: pokemon.id,
  name: pokemon.name,
  sprite: pokemon.sprite,
  hp: pokemon.hp,
  currentHp: pokemon.hp,
  attack: pokemon.attack,
  defense: pokemon.defense,
  speed: pokemon.speed,
  defeated: false,
});

const getActivePokemon = (player) => player.team[player.activePokemonIndex] ?? null;

const normalizeBattlePokemonPayload = (pokemon) => ({
  pokemonId: pokemon.pokemonId,
  name: pokemon.name,
  sprite: pokemon.sprite,
  hp: pokemon.hp,
  currentHp: pokemon.currentHp,
  attack: pokemon.attack,
  defense: pokemon.defense,
  speed: pokemon.speed,
  defeated: pokemon.defeated,
});

export const normalizeBattleStatePayload = (battle) => ({
  battleId: battle.id,
  lobbyId: String(battle.lobbyId),
  status: battle.status,
  currentTurnPlayerId: battle.currentTurnPlayerId ? String(battle.currentTurnPlayerId) : null,
  winnerPlayerId: battle.winnerPlayerId ? String(battle.winnerPlayerId) : null,
  disconnectedPlayerId: battle.disconnectedPlayerId ? String(battle.disconnectedPlayerId) : null,
  reconnectDeadlineAt: battle.reconnectDeadlineAt ? new Date(battle.reconnectDeadlineAt).toISOString() : null,
  finishReason: battle.finishReason ?? null,
  players: battle.players.map((player) => ({
    playerId: String(player.playerId),
    activePokemonIndex: player.activePokemonIndex,
    activePokemon: getActivePokemon(player) ? normalizeBattlePokemonPayload(getActivePokemon(player)) : null,
    team: player.team.map(normalizeBattlePokemonPayload),
  })),
});

export const normalizeBattleEndPayload = (battle) => ({
  battleId: battle.id,
  lobbyId: String(battle.lobbyId),
  winnerPlayerId: battle.winnerPlayerId ? toPlayerId(battle.winnerPlayerId) : null,
  status: battle.status,
  reason: battle.finishReason ?? null,
  disconnectedPlayerId: battle.disconnectedPlayerId ? toPlayerId(battle.disconnectedPlayerId) : null,
});

const findNextAvailablePokemonIndex = (team, currentIndex) => {
  for (let index = currentIndex + 1; index < team.length; index += 1) {
    if (!team[index].defeated && team[index].currentHp > 0) {
      return index;
    }
  }

  return -1;
};

export const createBattleService = (dependencies = {}) => {
  const {
    runSerializedDependency = runSerialized,
    findLobbyByIdDependency = findLobbyById,
    saveLobbyDependency = saveLobby,
    createBattleDependency = createBattle,
    findBattleByIdDependency = findBattleById,
    findBattleByLobbyIdDependency = findBattleByLobbyId,
    saveBattleDependency = saveBattle,
    findPlayerByIdDependency = findPlayerById,
    updatePlayerStateDependency = updatePlayerState,
    updatePlayersStateDependency = updatePlayersState,
    getPokemonByIdDependency = getPokemonById,
    calculateDamageDependency = calculateDamage,
    applyDamageDependency = applyDamage,
    resolveFirstTurnDependency = resolveFirstTurn,
  } = dependencies;

  const finishBattleSnapshot = async ({ battle, winnerPlayerId, finishReason, disconnectedPlayerId = null }) => {
    battle.status = BATTLE_STATUS.FINISHED;
    battle.winnerPlayerId = winnerPlayerId;
    battle.currentTurnPlayerId = null;
    battle.disconnectedPlayerId = disconnectedPlayerId;
    battle.reconnectDeadlineAt = null;
    battle.finishReason = finishReason;

    const lobby = await findLobbyByIdDependency(battle.lobbyId);

    if (lobby) {
      lobby.status = LOBBY_STATUS.FINISHED;
      await saveLobbyDependency(lobby);
    }

    await updatePlayersStateDependency(
      battle.players.map((player) => player.playerId),
      {
        status: PLAYER_STATUS.IDLE,
        activeLobbyId: null,
        activeBattleId: null,
        disconnectedAt: null,
      },
    );

    if (finishReason === BATTLE_FINISH_REASONS.DISCONNECT_TIMEOUT && disconnectedPlayerId) {
      await updatePlayerStateDependency(disconnectedPlayerId, {
        $set: {
          sessionStatus: SESSION_STATUS.CLOSED,
          socketId: null,
          disconnectedAt: null,
        },
        $unset: {
          sessionTokenHash: 1,
        },
      });
    }

    await saveBattleDependency(battle);

    return normalizeBattleEndPayload(battle);
  };

  const startBattle = async ({ lobbyId }) => {
    if (!lobbyId) {
      throw new AppError('lobbyId is required', 400);
    }

    const lobby = await findLobbyByIdDependency(lobbyId);

    if (!lobby) {
      throw new AppError('Lobby not found', 404);
    }

    if (lobby.players.length !== 2) {
      throw new AppError('Two players are required to start a battle', 409);
    }

    if (!lobby.players.every((player) => player.ready && player.team.length === 3)) {
      throw new AppError('Lobby is not ready to start the battle', 409);
    }

    const existingBattle = await findBattleByLobbyIdDependency(lobby.id);

    if (existingBattle && existingBattle.status !== BATTLE_STATUS.FINISHED) {
      return normalizeBattleStatePayload(existingBattle);
    }

    const battlePlayers = await Promise.all(
      lobby.players.map(async (player) => {
        const team = await Promise.all(
          player.team.map(async (teamPokemon) => {
            const pokemon = await getPokemonByIdDependency(teamPokemon.pokemonId);
            return createBattlePokemon(pokemon);
          }),
        );

        return {
          playerId: player.playerId,
          nickname: player.nickname,
          activePokemonIndex: 0,
          team,
        };
      }),
    );

    const [firstPlayer, secondPlayer] = battlePlayers;
    const firstTurnPlayerId = resolveFirstTurnDependency({
      challengerSpeed: firstPlayer.team[0].speed,
      defenderSpeed: secondPlayer.team[0].speed,
      challengerPlayerId: firstPlayer.playerId,
      defenderPlayerId: secondPlayer.playerId,
    });

    const battle = await createBattleDependency({
      lobbyId: lobby.id,
      status: BATTLE_STATUS.BATTLING,
      currentTurnPlayerId: firstTurnPlayerId,
      winnerPlayerId: null,
      disconnectedPlayerId: null,
      reconnectDeadlineAt: null,
      finishReason: null,
      players: battlePlayers,
      log: [
        {
          event: 'battle_start',
          payload: {
            currentTurnPlayerId: toPlayerId(firstTurnPlayerId),
          },
        },
      ],
    });

    lobby.status = LOBBY_STATUS.BATTLING;
    await saveLobbyDependency(lobby);
    await updatePlayersStateDependency(
      lobby.players.map((player) => player.playerId),
      {
        status: PLAYER_STATUS.BATTLING,
        activeLobbyId: lobby.id,
        activeBattleId: battle.id,
      },
    );

    return normalizeBattleStatePayload(battle);
  };

  const processAttack = async ({ battleId, playerId }) =>
    runSerializedDependency(battleLockKey(battleId), async () => {
      if (!battleId || !playerId) {
        throw new AppError('battleId and playerId are required', 400);
      }

      const battle = await findBattleByIdDependency(battleId);

      if (!battle) {
        throw new AppError('Battle not found', 404);
      }

      if (battle.status === BATTLE_STATUS.PAUSED) {
        throw new AppError('Battle is paused awaiting player reconnection', 409);
      }

      if (battle.status === BATTLE_STATUS.FINISHED) {
        throw new AppError('Battle is already finished', 409);
      }

      if (toPlayerId(battle.currentTurnPlayerId) !== String(playerId)) {
        throw new AppError('Player cannot attack out of turn', 409);
      }

      const attacker = battle.players.find((player) => toPlayerId(player.playerId) === String(playerId));
      const defender = battle.players.find((player) => toPlayerId(player.playerId) !== String(playerId));

      if (!attacker || !defender) {
        throw new AppError('Battle players are invalid', 500);
      }

      const attackerPokemon = getActivePokemon(attacker);
      const defenderPokemon = getActivePokemon(defender);

      if (!attackerPokemon || !defenderPokemon) {
        throw new AppError('Active pokemon not found', 500);
      }

      const damage = calculateDamageDependency({
        attack: attackerPokemon.attack,
        defense: defenderPokemon.defense,
      });

      defenderPokemon.currentHp = applyDamageDependency({
        currentHp: defenderPokemon.currentHp,
        damage,
      });

      let battleEndPayload = null;
      let autoSwitchedPokemon = null;

      if (defenderPokemon.currentHp === 0) {
        defenderPokemon.defeated = true;

        const nextPokemonIndex = findNextAvailablePokemonIndex(defender.team, defender.activePokemonIndex);

        if (nextPokemonIndex === -1) {
          battleEndPayload = await finishBattleSnapshot({
            battle,
            winnerPlayerId: attacker.playerId,
            finishReason: BATTLE_FINISH_REASONS.HP_DEPLETED,
          });
        } else {
          defender.activePokemonIndex = nextPokemonIndex;

          autoSwitchedPokemon = {
            playerId: toPlayerId(defender.playerId),
            activePokemonIndex: defender.activePokemonIndex,
            pokemon: getActivePokemon(defender),
          };

          battle.currentTurnPlayerId = defender.playerId;
        }
      } else {
        battle.currentTurnPlayerId = defender.playerId;
      }

      battle.log.push({
        event: 'turn_result',
        payload: {
          attackerPlayerId: toPlayerId(attacker.playerId),
          defenderPlayerId: toPlayerId(defender.playerId),
          damage,
          defenderRemainingHp: defenderPokemon.currentHp,
        },
      });

      if (battle.status !== BATTLE_STATUS.FINISHED) {
        await saveBattleDependency(battle);
      }

      return {
        accepted: true,
        lobbyId: String(battle.lobbyId),
        turnResult: {
          battleId: battle.id,
          attackerPlayerId: toPlayerId(attacker.playerId),
          defenderPlayerId: toPlayerId(defender.playerId),
          attackerPokemonId: attackerPokemon.pokemonId,
          defenderPokemonId: defenderPokemon.pokemonId,
          damage,
          defenderRemainingHp: defenderPokemon.currentHp,
          defenderDefeated: defenderPokemon.defeated,
          autoSwitchedPokemon,
          nextTurnPlayerId: battle.currentTurnPlayerId ? toPlayerId(battle.currentTurnPlayerId) : null,
          battleStatus: battle.status,
        },
        battleEnd: battleEndPayload,
      };
    });

  const pauseBattleForDisconnect = async ({
    playerId,
    socketId,
    gracePeriodMs = DISCONNECT_GRACE_PERIOD_MS,
  }) => {
    if (!playerId || !socketId) {
      return null;
    }

    const player = await findPlayerByIdDependency(playerId);

    if (!player || String(player.socketId ?? '') !== String(socketId) || !player.activeBattleId) {
      return null;
    }

    return await runSerializedDependency(battleLockKey(player.activeBattleId), async () => {
      const latestPlayer = await findPlayerByIdDependency(playerId);

      if (!latestPlayer || String(latestPlayer.socketId ?? '') !== String(socketId) || !latestPlayer.activeBattleId) {
        return null;
      }

      const battle = await findBattleByIdDependency(latestPlayer.activeBattleId);

      if (!battle || battle.status !== BATTLE_STATUS.BATTLING) {
        return null;
      }

      const battlePlayer = battle.players.find((entry) => toPlayerId(entry.playerId) === String(playerId));

      if (!battlePlayer) {
        return null;
      }

      const reconnectDeadlineAt = new Date(Date.now() + gracePeriodMs);

      battle.status = BATTLE_STATUS.PAUSED;
      battle.disconnectedPlayerId = latestPlayer.id;
      battle.reconnectDeadlineAt = reconnectDeadlineAt;
      battle.finishReason = null;
      battle.log.push({
        event: 'battle_pause',
        payload: {
          disconnectedPlayerId: String(latestPlayer.id),
          reconnectDeadlineAt: reconnectDeadlineAt.toISOString(),
        },
      });

      await saveBattleDependency(battle);
      await updatePlayerStateDependency(latestPlayer.id, {
        socketId: null,
        disconnectedAt: new Date(),
      });

      return normalizeBattleStatePayload(battle);
    });
  };

  const resumeBattleAfterReconnect = async ({ playerId }) => {
    if (!playerId) {
      throw new AppError('playerId is required', 400);
    }

    const player = await findPlayerByIdDependency(playerId);

    if (!player?.activeBattleId) {
      return {
        resumed: false,
        battleState: null,
        battleEnd: null,
      };
    }

    return await runSerializedDependency(battleLockKey(player.activeBattleId), async () => {
      const battle = await findBattleByIdDependency(player.activeBattleId);

      if (!battle || battle.status !== BATTLE_STATUS.PAUSED) {
        return {
          resumed: false,
          battleState: battle ? normalizeBattleStatePayload(battle) : null,
          battleEnd: battle?.status === BATTLE_STATUS.FINISHED ? normalizeBattleEndPayload(battle) : null,
        };
      }

      if (toPlayerId(battle.disconnectedPlayerId) !== String(playerId)) {
        return {
          resumed: false,
          battleState: normalizeBattleStatePayload(battle),
          battleEnd: null,
        };
      }

      const deadlineMs = battle.reconnectDeadlineAt ? new Date(battle.reconnectDeadlineAt).getTime() : 0;

      if (deadlineMs && deadlineMs <= Date.now()) {
        const opponent = battle.players.find((entry) => toPlayerId(entry.playerId) !== String(playerId));

        if (!opponent) {
          throw new AppError('Battle players are invalid', 500);
        }

        const battleEnd = await finishBattleSnapshot({
          battle,
          winnerPlayerId: opponent.playerId,
          finishReason: BATTLE_FINISH_REASONS.DISCONNECT_TIMEOUT,
          disconnectedPlayerId: playerId,
        });

        return {
          resumed: false,
          battleState: null,
          battleEnd,
        };
      }

      battle.status = BATTLE_STATUS.BATTLING;
      battle.disconnectedPlayerId = null;
      battle.reconnectDeadlineAt = null;
      battle.finishReason = null;
      battle.log.push({
        event: 'battle_resume',
        payload: {
          playerId: String(playerId),
        },
      });

      await saveBattleDependency(battle);
      await updatePlayerStateDependency(playerId, {
        disconnectedAt: null,
      });

      return {
        resumed: true,
        battleState: normalizeBattleStatePayload(battle),
        battleEnd: null,
      };
    });
  };

  const finishBattleByDisconnectTimeout = async ({ battleId }) => {
    if (!battleId) {
      throw new AppError('battleId is required', 400);
    }

    return await runSerializedDependency(battleLockKey(battleId), async () => {
      const battle = await findBattleByIdDependency(battleId);

      if (!battle || battle.status !== BATTLE_STATUS.PAUSED || !battle.disconnectedPlayerId) {
        return null;
      }

      const deadlineMs = battle.reconnectDeadlineAt ? new Date(battle.reconnectDeadlineAt).getTime() : 0;

      if (deadlineMs && deadlineMs > Date.now()) {
        return null;
      }

      const opponent = battle.players.find(
        (entry) => toPlayerId(entry.playerId) !== toPlayerId(battle.disconnectedPlayerId),
      );

      if (!opponent) {
        throw new AppError('Battle players are invalid', 500);
      }

      return await finishBattleSnapshot({
        battle,
        winnerPlayerId: opponent.playerId,
        finishReason: BATTLE_FINISH_REASONS.DISCONNECT_TIMEOUT,
        disconnectedPlayerId: battle.disconnectedPlayerId,
      });
    });
  };

  return {
    startBattle,
    processAttack,
    pauseBattleForDisconnect,
    resumeBattleAfterReconnect,
    finishBattleByDisconnectTimeout,
  };
};

export const { startBattle, processAttack, pauseBattleForDisconnect, resumeBattleAfterReconnect, finishBattleByDisconnectTimeout } =
  createBattleService();
