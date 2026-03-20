# Socket.IO Contracts

Documentacion operativa de la capa Socket.IO del backend.

Base namespace:

- `io("http://localhost:3000")`

Regla general de acknowledgements:

- todos los eventos cliente -> servidor aceptan callback opcional
- todos los payloads se validan antes de tocar la lógica de negocio
- respuesta exitosa:

```json
{
  "ok": true,
  "data": {}
}
```

- respuesta fallida:

```json
{
  "ok": false,
  "message": "Human readable error"
}
```

Ejemplo de error de validación:

```json
{
  "ok": false,
  "message": "playerId is required"
}
```

## Reglas de validación

- `nickname`
  - string requerido
  - se aplica `trim`
  - no puede quedar vacío
  - máximo 30 caracteres
- `playerId`
  - string requerido
  - no puede quedar vacío
- `lobbyId`
  - string requerido
  - no puede quedar vacío
- `battleId`
  - string requerido
  - no puede quedar vacío

## Cliente -> servidor

### `join_lobby`

Payload:

```json
{
  "nickname": "Ash"
}
```

Ack exitoso:

```json
{
  "ok": true,
  "data": {
    "playerId": "player-id",
    "lobbyId": "lobby-id",
    "status": "waiting",
    "lobbyStatus": {
      "lobbyId": "lobby-id",
      "status": "waiting",
      "players": [
        {
          "playerId": "player-id",
          "nickname": "Ash",
          "ready": false,
          "team": []
        }
      ]
    }
  }
}
```

Notas:

- `join_lobby` mantiene compatibilidad con el flujo original
- en escenarios multi-lobby, busca el lobby `waiting` mas antiguo con espacio
- si `nickname` llega vacío o inválido, responde error de validación por ack

### `search_match`

Payload:

```json
{
  "nickname": "Ash"
}
```

Comportamiento:

- es alias funcional de `join_lobby`
- se recomienda como evento principal para matchmaking

### `cancel_search`

Payload:

```json
{
  "playerId": "player-id"
}
```

Ack exitoso:

```json
{
  "ok": true,
  "data": {
    "playerId": "player-id",
    "canceled": true,
    "lobbyId": "lobby-id",
    "lobbyStatus": {
      "lobbyId": "lobby-id",
      "status": "finished",
      "players": []
    }
  }
}
```

Restricciones:

- solo funciona cuando el jugador sigue solo en un lobby `waiting`
- si ya fue emparejado, responde error
- si `playerId` falta, responde error de validación por ack

### `assign_pokemon`

Payload:

```json
{
  "playerId": "player-id",
  "lobbyId": "lobby-id"
}
```

Ack exitoso:

```json
{
  "ok": true,
  "data": {
    "lobbyId": "lobby-id",
    "playerId": "player-id",
    "team": [
      {
        "pokemonId": 25,
        "name": "Pikachu"
      }
    ],
    "lobbyStatus": {
      "lobbyId": "lobby-id",
      "status": "waiting",
      "players": []
    }
  }
}
```

Restricciones:

- requiere 2 jugadores en el lobby
- solo se permite mientras el lobby siga en `waiting`
- la asignacion es aleatoria y sin repetidos entre ambos jugadores

### `ready`

Payload:

```json
{
  "playerId": "player-id",
  "lobbyId": "lobby-id"
}
```

Ack exitoso sin batalla iniciada:

```json
{
  "ok": true,
  "data": {
    "lobbyId": "lobby-id",
    "playerId": "player-id",
    "ready": true,
    "lobbyStatus": {
      "lobbyId": "lobby-id",
      "status": "waiting",
      "players": []
    }
  }
}
```

Ack exitoso con batalla iniciada:

```json
{
  "ok": true,
  "data": {
    "lobbyId": "lobby-id",
    "playerId": "player-id",
    "ready": true,
    "lobbyStatus": {
      "lobbyId": "lobby-id",
      "status": "ready",
      "players": []
    },
    "battleStart": {
      "battleId": "battle-id",
      "lobbyId": "lobby-id",
      "status": "battling",
      "currentTurnPlayerId": "player-id",
      "players": []
    }
  }
}
```

### `attack`

Payload:

```json
{
  "playerId": "player-id",
  "battleId": "battle-id"
}
```

Ack exitoso:

```json
{
  "ok": true,
  "data": {
    "accepted": true
  }
}
```

Restricciones:

- solo puede atacar el jugador cuyo turno esta activo
- si la batalla ya termino o el `battleId` no existe, responde error
- si falta `battleId` o `playerId`, responde error de validación por ack

### `reconnect_player`

Payload:

```json
{
  "playerId": "player-id"
}
```

Ack exitoso:

```json
{
  "ok": true,
  "data": {
    "playerId": "player-id",
    "lobbyId": "lobby-id",
    "previousSocketId": "old-socket-id",
    "lobbyStatus": {
      "lobbyId": "lobby-id",
      "status": "battling",
      "players": []
    },
    "battleState": {
      "battleId": "battle-id",
      "lobbyId": "lobby-id",
      "status": "battling",
      "currentTurnPlayerId": "player-id",
      "players": []
    }
  }
}
```

## Servidor -> cliente

### `search_status`

Payloads esperados:

```json
{
  "playerId": "player-id",
  "status": "searching",
  "lobbyId": "lobby-id"
}
```

```json
{
  "playerId": "player-id",
  "status": "idle",
  "canceled": true
}
```

### `match_found`

```json
{
  "lobbyId": "lobby-id",
  "players": [
    {
      "playerId": "player-id",
      "nickname": "Ash",
      "ready": false,
      "team": []
    }
  ]
}
```

### `lobby_status`

```json
{
  "lobbyId": "lobby-id",
  "status": "waiting",
  "players": [
    {
      "playerId": "player-id",
      "nickname": "Ash",
      "ready": false,
      "team": [
        {
          "pokemonId": 25,
          "name": "Pikachu"
        }
      ]
    }
  ]
}
```

Estados posibles de lobby:

- `waiting`
- `ready`
- `battling`
- `finished`

### `battle_start`

```json
{
  "battleId": "battle-id",
  "lobbyId": "lobby-id",
  "status": "battling",
  "currentTurnPlayerId": "player-id",
  "players": [
    {
      "playerId": "player-id",
      "activePokemonIndex": 0,
      "activePokemon": {
        "pokemonId": 25,
        "name": "Pikachu",
        "hp": 35,
        "currentHp": 35,
        "attack": 55,
        "defense": 40,
        "speed": 90,
        "defeated": false
      }
    }
  ]
}
```

### `turn_result`

```json
{
  "battleId": "battle-id",
  "attackerPlayerId": "player-id",
  "defenderPlayerId": "other-player-id",
  "attackerPokemonId": 25,
  "defenderPokemonId": 143,
  "damage": 12,
  "defenderRemainingHp": 148,
  "defenderDefeated": false,
  "autoSwitchedPokemon": null,
  "nextTurnPlayerId": "other-player-id",
  "battleStatus": "battling"
}
```

`autoSwitchedPokemon` puede venir como objeto cuando un Pokemon es derrotado y el cambio ocurre automaticamente:

```json
{
  "playerId": "player-id",
  "activePokemonIndex": 1,
  "pokemon": {
    "pokemonId": 6,
    "name": "Charizard",
    "hp": 78,
    "currentHp": 78,
    "attack": 84,
    "defense": 78,
    "speed": 100,
    "defeated": false
  }
}
```

### `battle_end`

```json
{
  "battleId": "battle-id",
  "lobbyId": "lobby-id",
  "winnerPlayerId": "player-id",
  "status": "finished"
}
```

## Errores de negocio comunes

- `Nickname is already taken in the current lobby`
- `Player is not in matchmaking search`
- `Player can only cancel while waiting for a match`
- `Two players are required before assigning pokemon`
- `Team assignment is locked once a player is ready`
- `Player does not have an assigned team`
- `Player cannot attack out of turn`
- `Player not found`
- `Battle not found`

## Errores de validación comunes

- `nickname is required`
- `nickname must be at most 30 characters`
- `playerId is required`
- `lobbyId is required`
- `battleId is required`

## Alcance

Esta documentacion cubre el contrato actual implementado en el backend.

No cubre:

- autenticacion
- autorizacion
- namespaces adicionales de Socket.IO
- versionado de eventos
