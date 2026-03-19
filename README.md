# Pokemon Stadium Lite Backend

Backend inicial para la prueba técnica de Pokémon Stadium Lite. El proyecto está organizado como un monolito modular en JavaScript, con separación por feature y entradas diferenciadas para HTTP y WebSocket.

## Objetivo del scaffold

Este scaffold deja listo el punto de arranque del backend y la estructura base para continuar la implementación sin mezclar responsabilidades:

- servidor HTTP con Express
- servidor WebSocket con Socket.IO
- versionado REST en `/api/v1`
- integración real con la API externa de Pokémon
- conexión opcional a MongoDB con Mongoose
- módulos separados para `pokemon`, `players`, `lobby` y `battle`
- servicios y repositorios preparados para completar la lógica de negocio

No se cerró la lógica completa de lobby ni batalla. Quedó preparada la estructura y los contratos principales para implementar esa parte con tus decisiones finales.

## Requisitos

- Node.js 18 o superior
- MongoDB si quieres persistencia real desde esta etapa

## Scripts

```bash
npm install
npm run dev
```

Otros scripts:

```bash
npm start
npm run check
```

## Variables de entorno

Usa `.env.example` como referencia.

```env
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=
POKEMON_API_BASE_URL=https://pokemon-api-92034153384.us-central1.run.app
```

Si `MONGODB_URI` no está configurada, el servidor arranca sin conexión a base de datos. Esto permite trabajar primero en el contrato y luego conectar persistencia.

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
```

## Módulos

### `pokemon`

Responsable del catálogo externo.

- `GET /api/v1/pokemon`
- `GET /api/v1/pokemon/:id`

Este módulo ya consume la API externa y normaliza la respuesta mínima usada por el backend.

### `players`

Responsable de la persistencia y creación de jugadores.

Actualmente incluye:

- esquema base de jugador
- repositorio de acceso a datos
- servicio para registrar jugador con nickname y `socketId`

### `lobby`

Responsable del flujo previo a la batalla.

Actualmente incluye:

- esquema base de lobby
- repositorio de lobby
- sockets para `join_lobby` y `ready`
- servicios con firmas ya definidas para implementar el flujo real

Pendiente en este módulo:

- lobby único con máximo 2 jugadores
- asignación aleatoria de 3 Pokémon sin repetir entre jugadores
- transición de estados `waiting -> ready -> battling -> finished`

### `battle`

Responsable del combate en tiempo real.

Actualmente incluye:

- esquema base de batalla
- repositorio de batalla
- socket para `attack`
- utilidades puras para cálculo de daño y selección del primer turno
- servicio principal de batalla pendiente

Pendiente en este módulo:

- inicio automático cuando ambos jugadores estén listos
- procesamiento atómico del ataque
- reducción de HP
- derrota, cambio automático de Pokémon y ganador
- emisión de eventos de resultado

## Eventos Socket.IO previstos

Cliente a servidor:

- `join_lobby`
- `assign_pokemon`
- `ready`
- `attack`

Servidor a cliente:

- `lobby_status`
- `battle_start`
- `turn_result`
- `battle_end`

En este scaffold quedaron registrados los eventos de entrada principales (`join_lobby`, `assign_pokemon`, `ready`, `attack`) y su wiring hacia servicios.

## Estado actual

Implementado:

- arranque del servidor
- middleware base
- healthcheck
- versionado REST
- consumo del catálogo Pokémon
- wiring de sockets
- modelos iniciales de `Player`, `Lobby` y `Battle`
- utilidades puras de daño y turno

Pendiente:

- reglas completas de lobby
- sincronización de batalla
- persistencia final del estado de combate
- emisión completa de eventos del servidor
- tests

## Próximos pasos sugeridos

1. Implementar `joinLobby` en [src/modules/lobby/services/lobby.service.js](/Users/angelmoran/Documents/albo/pokemon-stadium-lite-backend/src/modules/lobby/services/lobby.service.js).
2. Implementar `assignRandomTeam` en [src/modules/lobby/services/team-assignment.service.js](/Users/angelmoran/Documents/albo/pokemon-stadium-lite-backend/src/modules/lobby/services/team-assignment.service.js).
3. Completar `startBattle` y `processAttack` en [src/modules/battle/services/battle.service.js](/Users/angelmoran/Documents/albo/pokemon-stadium-lite-backend/src/modules/battle/services/battle.service.js).
4. Definir estrategia de serialización de acciones por lobby o batalla para evitar race conditions.
