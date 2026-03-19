import { Router } from 'express';

import { getPokemonDetail, getPokemonList } from './pokemon.controller.js';

const router = Router();

router.get('/', getPokemonList);
router.get('/:id', getPokemonDetail);

export default router;
