import { asyncHandler } from '../../../shared/utils/async-handler.js';
import { buildSuccessResponse } from '../../../shared/utils/api-response.js';
import {
  closePlayerSession,
  createOrRefreshSession,
  getPlayerSession,
} from '../services/player-session.service.js';

export const createPlayerSessionController = (dependencies = {}) => {
  const {
    createOrRefreshSessionDependency = createOrRefreshSession,
    getPlayerSessionDependency = getPlayerSession,
    closePlayerSessionDependency = closePlayerSession,
  } = dependencies;

  const createSession = asyncHandler(async (request, response) => {
    const session = await createOrRefreshSessionDependency({
      nickname: request.body.nickname,
    });

    response.status(201).json(
      buildSuccessResponse({
        data: session,
      }),
    );
  });

  const getCurrentSession = asyncHandler(async (request, response) => {
    const session = await getPlayerSessionDependency({
      playerId: request.player.id,
    });

    response.json(
      buildSuccessResponse({
        data: session,
      }),
    );
  });

  const deleteCurrentSession = asyncHandler(async (request, response) => {
    await closePlayerSessionDependency({
      playerId: request.player.id,
    });

    response.json(
      buildSuccessResponse({
        data: {
          closed: true,
        },
      }),
    );
  });

  return {
    createSession,
    getCurrentSession,
    deleteCurrentSession,
  };
};

export const { createSession, getCurrentSession, deleteCurrentSession } =
  createPlayerSessionController();
