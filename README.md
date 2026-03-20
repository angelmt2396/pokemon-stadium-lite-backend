# Pokemon Stadium Lite Backend

Backend fullstack para la prueba técnica de Pokémon Stadium Lite.

El proyecto está implementado como un monolito modular en JavaScript con:

- Express para HTTP
- Socket.IO para tiempo real
- MongoDB con Mongoose para persistencia
- matchmaking con múltiples lobbies concurrentes
- catálogo Pokémon consumido desde proveedor externo

## Estado actual

Implementado:

- `GET /health`
- `GET /api/v1/pokemon`
- `GET /api/v1/pokemon/:id`
- `join_lobby`
- `search_match`
- `cancel_search`
- `assign_pokemon`
- `ready`
- `attack`
- `reconnect_player`
- matchmaking por orden de llegada hacia lobbies `waiting`
- múltiples lobbies activos al mismo tiempo
- estados explícitos de jugador: `idle`, `searching`, `in_lobby`, `battling`
- asignación aleatoria sin repetidos entre jugadores
- inicio automático de batalla cuando ambos jugadores están listos
- cálculo de daño y cambio automático de Pokémon
- determinación de ganador
- serialización de acciones para evitar race conditions básicas

## Requisitos

- Node.js 18+
- MongoDB

## Instalación

```bash
npm install
```

## Variables de entorno

Usa [.env.example](./.env.example) como base.

```env
PORT=3000
LOG_LEVEL=info
CLIENT_ORIGIN=http://localhost:5173,http://localhost:4173
MONGODB_URI=mongodb://127.0.0.1:27017/pokemon-stadium-lite
POKEMON_API_BASE_URL=https://pokemon-api-92034153384.us-central1.run.app
```

Notas:

- `LOG_LEVEL` soporta: `debug`, `info`, `warn`, `error`, `silent`
- el backend escribe logs JSON estructurados para HTTP, arranque, errores y eventos Socket.IO

## Scripts

```bash
npm run dev
npm start
npm run check
npm run test
npm run test:unit
npm run test:integration
npm run test:http
npm run test:e2e
```

## API REST

Swagger UI:

- `GET /docs`

Spec OpenAPI cruda:

- `GET /docs/openapi.json`

Portal HTML consolidado:

- `GET /documentation`

Rutas incluidas:

- `GET /health`
- `GET /api/v1/pokemon`
- `GET /api/v1/pokemon/:id`

## Socket.IO

Eventos cliente -> servidor:

- `join_lobby`
- `search_match`
- `cancel_search`
- `assign_pokemon`
- `ready`
- `attack`
- `reconnect_player`

Eventos servidor -> cliente:

- `search_status`
- `match_found`
- `lobby_status`
- `battle_start`
- `turn_result`
- `battle_end`

Contrato detallado:

- [docs/socket-contracts.md](./docs/socket-contracts.md)

## Estructura

```txt
src/
  api/
    v1/
  config/
  modules/
    battle/
      repositories/
      schemas/
      services/
      socket/
    lobby/
      repositories/
      schemas/
      services/
      socket/
    players/
      repositories/
      schemas/
      services/
    pokemon/
      http/
      mappers/
      repositories/
      services/
  shared/
    constants/
    errors/
    utils/
  sockets/
tests/
  unit/
  integration/
  http/
  e2e/
```

## Testing

La suite actual cubre cuatro capas:

- unit
- integration de servicios
- HTTP
- E2E Socket.IO con clientes reales

Ejecutar todo:

```bash
npm test
```

Detalle de la suite:

- [tests/README.md](./tests/README.md)

## Notas

- La API externa real del catálogo devuelve más campos de los descritos en la prueba; el backend conserva `sprite`.
- La reconexión está soportada a nivel de jugador usando `playerId`.
- Los tests E2E y HTTP levantan servidores locales efímeros durante la suite.
