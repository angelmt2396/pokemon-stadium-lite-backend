const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10000;

export const closeHttpServer = (httpServer) =>
  new Promise((resolve, reject) => {
    if (!httpServer?.listening) {
      resolve(false);
      return;
    }

    httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(true);
    });
  });

export const createGracefulShutdownManager = (dependencies = {}) => {
  const {
    httpServer,
    logger,
    closeHttpServerDependency = closeHttpServer,
    closeSocketServerDependency = async () => false,
    disconnectDatabaseDependency = async () => false,
    timeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS,
  } = dependencies;

  let shutdownPromise = null;

  const shutdown = async (reason = 'unknown') => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      logger?.info?.('shutdown_started', {
        reason,
        timeoutMs,
      });

      let timeoutId;

      try {
        const shutdownTimeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Shutdown timed out after ${timeoutMs}ms`));
          }, timeoutMs);

          timeoutId.unref?.();
        });

        const orderlyShutdownPromise = (async () => {
          const httpServerClosePromise = closeHttpServerDependency(httpServer);

          await closeSocketServerDependency();
          await httpServerClosePromise;
          await disconnectDatabaseDependency();
        })();

        await Promise.race([orderlyShutdownPromise, shutdownTimeoutPromise]);

        logger?.info?.('shutdown_completed', {
          reason,
        });
      } catch (error) {
        logger?.error?.('shutdown_failed', {
          reason,
          error,
        });
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    })();

    return shutdownPromise;
  };

  const createSignalHandler = (signal) => async () => {
    try {
      await shutdown(signal);
      process.exit(0);
    } catch {
      process.exit(1);
    }
  };

  const registerSignalHandlers = (signals = ['SIGTERM', 'SIGINT']) => {
    signals.forEach((signal) => {
      process.once(signal, createSignalHandler(signal));
    });
  };

  return {
    shutdown,
    createSignalHandler,
    registerSignalHandlers,
  };
};

