import test from 'node:test';
import assert from 'node:assert/strict';

import { applyDamage, calculateDamage } from '../../../src/modules/battle/services/damage.service.js';

test('calculateDamage returns attack minus defense when result is greater than zero', () => {
  const damage = calculateDamage({
    attack: 55,
    defense: 40,
  });

  assert.equal(damage, 15);
});

test('calculateDamage returns minimum damage of 1 when attack is not greater than defense', () => {
  assert.equal(
    calculateDamage({
      attack: 40,
      defense: 40,
    }),
    1,
  );

  assert.equal(
    calculateDamage({
      attack: 30,
      defense: 90,
    }),
    1,
  );
});

test('applyDamage reduces hp by damage amount', () => {
  const nextHp = applyDamage({
    currentHp: 100,
    damage: 17,
  });

  assert.equal(nextHp, 83);
});

test('applyDamage never returns a value below zero', () => {
  const nextHp = applyDamage({
    currentHp: 12,
    damage: 30,
  });

  assert.equal(nextHp, 0);
});
