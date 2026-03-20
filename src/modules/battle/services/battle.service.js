import { BATTLE_STATUS } from '../../../shared/constants/battle-status.js';
import { LOBBY_STATUS } from '../../../shared/constants/lobby-status.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { runSerialized } from '../../../shared/utils/serial-executor.js';
import { findLobbyById, saveLobby } from '../../lobby/repositories/lobby.repository.js';
import { createBattle, findBattleById, findBattleByLobbyId, saveBattle } from '../repositories/battle.repository.js';
import { getPokemonById } from '../../pokemon/services/pokemon.service.js';
import { calculateDamage, applyDamage } from './damage.service.js';
import { resolveFirstTurn } from './turn.service.js';

const toPlayerId = (playerId) => String(playerId);
const battleLockKey = (battleId) => `battle:${battleId}`;

const createBattlePokemon = (pokemon) => ({
  pokemonId: pokemon.id,
  name: pokemon.name,
  hp: pokemon.hp,
  currentHp: pokemon.hp,
  attack: pokemon.attack,
  defense: pokemon.defense,
  speed: pokemon.speed,
  defeated: false,
});

const getActivePokemon = (player) => player.team[player.activePokemonIndex] ?? null;

const normalizeBattleStartPayload = (battle) => ({
  battleId: battle.id,
  lobbyId: String(battle.lobbyId),
  status: battle.status,
  currentTurnPlayerId: battle.currentTurnPlayerId ? String(battle.currentTurnPlayerId) : null,
  players: battle.players.map((player) => ({
    playerId: String(player.playerId),
    activePokemonIndex: player.activePokemonIndex,
    activePokemon: getActivePokemon(player),
  })),
});

const findNextAvailablePokemonIndex = (team, currentIndex) => {
  for (let index = currentIndex + 1; index < team.length; index += 1) {
    if (!team[index].defeated && team[index].currentHp > 0) {
      return index;
    }
  }

  return -1;
};

export const startBattle = async ({ lobbyId }) => {
  if (!lobbyId) {
    throw new AppError('lobbyId is required', 400);
  }

  const lobby = await findLobbyById(lobbyId);

  if (!lobby) {
    throw new AppError('Lobby not found', 404);
  }

  if (lobby.players.length !== 2) {
    throw new AppError('Two players are required to start a battle', 409);
  }

  if (!lobby.players.every((player) => player.ready && player.team.length === 3)) {
    throw new AppError('Lobby is not ready to start the battle', 409);
  }

  const existingBattle = await findBattleByLobbyId(lobby.id);

  if (existingBattle && existingBattle.status !== BATTLE_STATUS.FINISHED) {
    return normalizeBattleStartPayload(existingBattle);
  }

  const battlePlayers = await Promise.all(
    lobby.players.map(async (player) => {
      const team = await Promise.all(
        player.team.map(async (teamPokemon) => {
          const pokemon = await getPokemonById(teamPokemon.pokemonId);
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
  const firstTurnPlayerId = resolveFirstTurn({
    challengerSpeed: firstPlayer.team[0].speed,
    defenderSpeed: secondPlayer.team[0].speed,
    challengerPlayerId: firstPlayer.playerId,
    defenderPlayerId: secondPlayer.playerId,
  });

  const battle = await createBattle({
    lobbyId: lobby.id,
    status: BATTLE_STATUS.BATTLING,
    currentTurnPlayerId: firstTurnPlayerId,
    winnerPlayerId: null,
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
  await saveLobby(lobby);

  return normalizeBattleStartPayload(battle);
};

export const processAttack = async ({ battleId, playerId }) =>
  runSerialized(battleLockKey(battleId), async () => {
    if (!battleId || !playerId) {
      throw new AppError('battleId and playerId are required', 400);
    }

    const battle = await findBattleById(battleId);

    if (!battle) {
      throw new AppError('Battle not found', 404);
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

    const damage = calculateDamage({
      attack: attackerPokemon.attack,
      defense: defenderPokemon.defense,
    });

    defenderPokemon.currentHp = applyDamage({
      currentHp: defenderPokemon.currentHp,
      damage,
    });

    let battleEndPayload = null;
    let autoSwitchedPokemon = null;

    if (defenderPokemon.currentHp === 0) {
      defenderPokemon.defeated = true;

      const nextPokemonIndex = findNextAvailablePokemonIndex(defender.team, defender.activePokemonIndex);

      if (nextPokemonIndex === -1) {
        battle.status = BATTLE_STATUS.FINISHED;
        battle.winnerPlayerId = attacker.playerId;
        battle.currentTurnPlayerId = null;

        const lobby = await findLobbyById(battle.lobbyId);

        if (lobby) {
          lobby.status = LOBBY_STATUS.FINISHED;
          await saveLobby(lobby);
        }

        battleEndPayload = {
          battleId: battle.id,
          lobbyId: String(battle.lobbyId),
          winnerPlayerId: toPlayerId(attacker.playerId),
          status: battle.status,
        };
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

    await saveBattle(battle);

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
