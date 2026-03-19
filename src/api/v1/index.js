import { Router } from 'express';

import pokemonRoutes from '../../modules/pokemon/http/pokemon.routes.js';

const router = Router();

router.use('/pokemon', pokemonRoutes);

export default router;
