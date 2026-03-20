import test from 'node:test';
import assert from 'node:assert/strict';

import { createTeamSelection } from '../../../src/modules/lobby/services/team-assignment.service.js';

const catalog = [
  { id: 1, name: 'Bulbasaur' },
  { id: 2, name: 'Ivysaur' },
  { id: 3, name: 'Venusaur' },
  { id: 4, name: 'Charmander' },
  { id: 5, name: 'Charmeleon' },
  { id: 6, name: 'Charizard' },
  { id: 7, name: 'Squirtle' },
  { id: 8, name: 'Wartortle' },
];

test('createTeamSelection returns the requested number of pokemon when enough catalog items exist', () => {
  const selection = createTeamSelection(catalog, 6);

  assert.equal(selection.length, 6);
});

test('createTeamSelection never returns duplicated pokemon ids', () => {
  const selection = createTeamSelection(catalog, 6);
  const ids = selection.map((pokemon) => pokemon.id);
  const uniqueIds = new Set(ids);

  assert.equal(uniqueIds.size, ids.length);
});

test('createTeamSelection does not mutate the original catalog', () => {
  const originalCatalog = [...catalog];

  createTeamSelection(catalog, 6);

  assert.deepEqual(catalog, originalCatalog);
});

test('createTeamSelection returns all available pokemon when requested amount exceeds catalog length', () => {
  const selection = createTeamSelection(catalog, 20);

  assert.equal(selection.length, catalog.length);
});
