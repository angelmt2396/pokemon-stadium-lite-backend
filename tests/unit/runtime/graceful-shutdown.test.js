import test from 'node:test';
import assert from 'node:assert/strict';

import {
  closeHttpServer,
  createGracefulShutdownManager,
} from '../../../src/shared/runtime/graceful-shutdown.js';

test('closeHttpServer resolves false when the server is not listening', async () => {
  const result = await closeHttpServer({
    listening: false,
  });

  assert.equal(result, false);
});

test('graceful shutdown closes socket server, http server and database once', async () => {
  const calls = [];
  const loggerCalls = [];
  const httpServer = {
    listening: true,
    close(callback) {
      calls.push('http');
      callback();
    },
  };

  const manager = createGracefulShutdownManager({
    httpServer,
    timeoutMs: 100,
    logger: {
      info(message, context) {
        loggerCalls.push({
          level: 'info',
          message,
          context,
        });
      },
      error(message, context) {
        loggerCalls.push({
          level: 'error',
          message,
          context,
        });
      },
    },
    closeSocketServerDependency: async () => {
      calls.push('socket');
      return true;
    },
    disconnectDatabaseDependency: async () => {
      calls.push('database');
      return true;
    },
  });

  const firstShutdownPromise = manager.shutdown('test');
  const secondShutdownPromise = manager.shutdown('test');

  await Promise.all([firstShutdownPromise, secondShutdownPromise]);

  assert.deepEqual(calls, ['http', 'socket', 'database']);
  assert.equal(
    loggerCalls.some((entry) => entry.message === 'shutdown_started'),
    true,
  );
  assert.equal(
    loggerCalls.some((entry) => entry.message === 'shutdown_completed'),
    true,
  );
});

test('graceful shutdown rejects when shutdown exceeds timeout', async () => {
  const httpServer = {
    listening: true,
    close() {},
  };

  const manager = createGracefulShutdownManager({
    httpServer,
    timeoutMs: 10,
    logger: {
      info() {},
      error() {},
    },
    closeSocketServerDependency: async () =>
      new Promise(() => {
        // Intentionally pending to force timeout.
      }),
    disconnectDatabaseDependency: async () => true,
  });

  await assert.rejects(
    manager.shutdown('timeout-test'),
    /Shutdown timed out after 10ms/,
  );
});
