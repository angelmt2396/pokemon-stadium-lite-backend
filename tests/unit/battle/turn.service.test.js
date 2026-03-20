import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveFirstTurn } from '../../../src/modules/battle/services/turn.service.js';

test('resolveFirstTurn returns challenger when challenger speed is greater', () => {
  const turnPlayerId = resolveFirstTurn({
    challengerSpeed: 90,
    defenderSpeed: 30,
    challengerPlayerId: 'player-ash',
    defenderPlayerId: 'player-misty',
  });

  assert.equal(turnPlayerId, 'player-ash');
});

test('resolveFirstTurn returns defender when defender speed is greater', () => {
  const turnPlayerId = resolveFirstTurn({
    challengerSpeed: 45,
    defenderSpeed: 80,
    challengerPlayerId: 'player-ash',
    defenderPlayerId: 'player-misty',
  });

  assert.equal(turnPlayerId, 'player-misty');
});

test('resolveFirstTurn breaks ties in favor of challenger', () => {
  const turnPlayerId = resolveFirstTurn({
    challengerSpeed: 60,
    defenderSpeed: 60,
    challengerPlayerId: 'player-ash',
    defenderPlayerId: 'player-misty',
  });

  assert.equal(turnPlayerId, 'player-ash');
});
