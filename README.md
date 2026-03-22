# Pokemon Stadium Lite Backend

Backend fullstack para la prueba técnica de Pokémon Stadium Lite.

El proyecto está implementado como un monolito modular en JavaScript con:

- Express para HTTP
- Socket.IO para tiempo real
- MongoDB con Mongoose para persistencia
- validación de entrada con `zod`
- matchmaking con múltiples lobbies concurrentes
- catálogo Pokémon consumido desde proveedor externo

## Estado actual

Implementado:

- `GET /health`
- `POST /api/v1/player-sessions`
- `GET /api/v1/player-sessions/me`
- `DELETE /api/v1/player-sessions/me`
- `GET /api/v1/pokemon`
- `GET /api/v1/pokemon/:id`
- `search_match`
- `cancel_search`
- `assign_pokemon`
- `ready`
- `attack`
- `reconnect_player`
- matchmaking por orden de llegada hacia lobbies `waiting`
- sesion ligera por nickname con `sessionToken`
- múltiples lobbies activos al mismo tiempo
- estados explícitos de jugador: `idle`, `searching`, `in_lobby`, `battling`
- asignación aleatoria sin repetidos entre jugadores
- inicio automático de batalla cuando ambos jugadores están listos
- cálculo de daño y cambio automático de Pokémon
- determinación de ganador
- serialización de acciones para evitar race conditions básicas
- validación de payloads HTTP y Socket.IO antes de llegar a la lógica de negocio

## Requisitos

- Node.js 18+
- Docker + Docker Compose o MongoDB local

## Instalación

```bash
npm install
```

## Correr en local

### Opción recomendada: MongoDB con Docker Compose

Desde la raíz del backend:

```bash
docker compose up --build -d
```

Esto levanta:

- MongoDB en `localhost:27017`
- backend en `http://localhost:3000`

La configuración del backend dentro de Docker Compose ya queda resuelta con:

- `MONGODB_URI=mongodb://mongo:27017/pokemon-stadium-lite`

Para detener Mongo:

```bash
docker compose down
```

Para detener Mongo y borrar los datos locales:

```bash
docker compose down -v
```

Para reconstruir después de cambios en código:

```bash
docker compose up --build -d
```

### Opción alternativa: MongoDB ya instalado en local

Si ya tienes MongoDB corriendo en tu máquina:

1. asegúrate de que esté disponible en `localhost:27017`
2. copia `.env.example` a `.env`
3. instala dependencias
4. arranca el backend

```bash
cp .env.example .env
npm install
npm run dev
```

## Variables de entorno

Usa [.env.example](./.env.example) como base.

```env
PORT=3000
LOG_LEVEL=info
SHUTDOWN_TIMEOUT_MS=10000
CLIENT_ORIGIN=http://localhost:5173,http://localhost:4173
MONGODB_URI=mongodb://127.0.0.1:27017/pokemon-stadium-lite
POKEMON_API_BASE_URL=https://pokemon-api-92034153384.us-central1.run.app
```

Notas:

- `LOG_LEVEL` soporta: `debug`, `info`, `warn`, `error`, `silent`
- `SHUTDOWN_TIMEOUT_MS` controla el tiempo máximo para cierre ordenado del proceso
- el backend escribe logs JSON estructurados para HTTP, arranque, errores y eventos Socket.IO
- la configuración crítica se valida al arrancar
- el `.env.example` ya viene listo para un Mongo local en `localhost:27017`

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
- `POST /api/v1/player-sessions`
- `GET /api/v1/player-sessions/me`
- `DELETE /api/v1/player-sessions/me`
- `GET /api/v1/pokemon`
- `GET /api/v1/pokemon/:id`

Notas:

- `POST /api/v1/player-sessions` crea una sesion ligera por nickname y devuelve `sessionToken`
- `GET /api/v1/player-sessions/me` y `DELETE /api/v1/player-sessions/me` requieren `Authorization: Bearer <sessionToken>`
- `GET /api/v1/pokemon/:id` devuelve `400` si `id` no es un entero positivo válido
- `/documentation` resume contratos REST y Socket.IO con ejemplos de requests, acks y eventos
- `/documentation` incluye un probador ligero de endpoints REST y eventos Socket.IO desde el navegador

## Socket.IO

Eventos cliente -> servidor:

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

Notas:

- el socket requiere `auth.sessionToken` durante el handshake
- los payloads de entrada se validan con `zod` antes de tocar la capa de negocio
- los errores de validación en Socket.IO responden vía ack con `{ "ok": false, "message": "..." }`
- `reconnect_player` requiere `reconnectToken`; `playerId` es opcional por compatibilidad y debe coincidir con la sesion
- `search_match` usa la identidad autenticada de la sesion y devuelve `reconnectToken` en el ack exitoso

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
- La reconexión ahora exige `playerId` más `reconnectToken`.
- La validación de entrada actual se implementa con `zod` en HTTP y Socket.IO.
- El proceso maneja `SIGTERM` y `SIGINT` con cierre ordenado de HTTP, Socket.IO y Mongo.
- Los schemas de Mongo incluyen índices básicos para players, lobbies y battles.
- Los tests E2E y HTTP levantan servidores locales efímeros durante la suite.

## Validación local rápida

Con el backend corriendo en local, puedes validar así:

1. abre [http://localhost:3000/docs](http://localhost:3000/docs)
2. abre [http://localhost:3000/documentation](http://localhost:3000/documentation)
3. prueba `GET /health`
4. prueba `GET /api/v1/pokemon`
5. usa el probador Socket.IO de `/documentation` con:
   - `search_match`
   - `assign_pokemon`
   - `ready`
   - `attack`

## Docker local

Archivos incluidos:

- [Dockerfile](./Dockerfile)
- [docker-compose.yml](./docker-compose.yml)

Comandos principales:

```bash
docker compose up --build -d
docker compose logs -f backend
docker compose down
docker compose down -v
```
