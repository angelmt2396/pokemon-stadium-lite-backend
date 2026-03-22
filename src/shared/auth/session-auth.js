import { authenticatePlayerSession } from '../../modules/players/services/player-session.service.js';
import { AppError } from '../errors/AppError.js';

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    throw new AppError('Authorization header is required', 401);
  }

  const [scheme, token, ...rest] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token || rest.length > 0 || !token.trim()) {
    throw new AppError('Authorization header must use Bearer token', 401);
  }

  return token.trim();
};

export const createRequirePlayerSessionMiddleware = (dependencies = {}) => {
  const {
    authenticatePlayerSessionDependency = authenticatePlayerSession,
  } = dependencies;

  return async (request, _response, next) => {
    try {
      const sessionToken = extractBearerToken(request.headers.authorization);
      const player = await authenticatePlayerSessionDependency({
        sessionToken,
      });

      request.player = player;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const createSocketSessionAuthMiddleware = (dependencies = {}) => {
  const {
    authenticatePlayerSessionDependency = authenticatePlayerSession,
  } = dependencies;

  return async (socket, next) => {
    try {
      const sessionToken = socket.handshake.auth?.sessionToken;

      if (!sessionToken || typeof sessionToken !== 'string' || !sessionToken.trim()) {
        throw new AppError('sessionToken is required in socket auth', 401);
      }

      const player = await authenticatePlayerSessionDependency({
        sessionToken: sessionToken.trim(),
      });

      socket.data.player = {
        playerId: String(player.id),
        nickname: player.nickname,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const getAuthenticatedSocketPlayerId = (socket, payloadPlayerId = undefined) => {
  const authenticatedPlayerId = socket.data?.player?.playerId;

  if (!authenticatedPlayerId) {
    throw new AppError('Socket session is not authenticated', 401);
  }

  if (
    payloadPlayerId !== undefined &&
    payloadPlayerId !== null &&
    String(payloadPlayerId) !== String(authenticatedPlayerId)
  ) {
    throw new AppError('Authenticated player does not match payload playerId', 403);
  }

  return authenticatedPlayerId;
};
