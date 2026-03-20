import { z } from 'zod';

const requiredTrimmedString = (fieldName) =>
  z
    .string({
      error: (issue) =>
        issue.input === undefined ? `${fieldName} is required` : `${fieldName} must be a string`,
    })
    .trim()
    .min(1, `${fieldName} is required`);

export const nicknameSchema = requiredTrimmedString('nickname').max(
  30,
  'nickname must be at most 30 characters',
);

export const playerIdSchema = requiredTrimmedString('playerId');
export const lobbyIdSchema = requiredTrimmedString('lobbyId');
export const battleIdSchema = requiredTrimmedString('battleId');

export const joinLobbyPayloadSchema = z
  .object({
    nickname: nicknameSchema,
  })
  .strict();

export const cancelSearchPayloadSchema = z
  .object({
    playerId: playerIdSchema,
  })
  .strict();

export const reconnectPlayerPayloadSchema = z
  .object({
    playerId: playerIdSchema,
  })
  .strict();

export const assignPokemonPayloadSchema = z
  .object({
    lobbyId: lobbyIdSchema,
    playerId: playerIdSchema,
  })
  .strict();

export const readyPayloadSchema = z
  .object({
    lobbyId: lobbyIdSchema,
    playerId: playerIdSchema,
  })
  .strict();

export const attackPayloadSchema = z
  .object({
    battleId: battleIdSchema,
    playerId: playerIdSchema,
  })
  .strict();

export const pokemonIdParamsSchema = z
  .object({
    id: z
      .coerce.number({
        error: 'id must be a number',
      })
      .int('id must be an integer')
      .positive('id must be a positive integer')
      .transform(String),
  })
  .strict();

