# Socket.IO Contracts

Documentacion operativa de la capa Socket.IO del backend.

Base namespace:

- `io("http://localhost:3000")`

Autenticacion de socket:

- el cliente debe conectarse con `auth.sessionToken`
- ejemplo:

```js
io('http://localhost:3000', {
  auth: {
    sessionToken: 'opaque-session-token',
  },
});
```

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
  - string opcional en `search_match`
  - se aplica `trim`
  - si se envia, no puede quedar vacío
  - máximo 30 caracteres
- `playerId`
  - string opcional por compatibilidad en eventos autenticados
  - si se envia, debe coincidir con el jugador autenticado por sesion
- `lobbyId`
  - string requerido
  - no puede quedar vacío
- `battleId`
  - string requerido
  - no puede quedar vacío
- `reconnectToken`
  - string requerido
  - no puede quedar vacío

## Cliente -> servidor

### `search_match`

Payload:

```json
{}
```

Comportamiento:

- es el evento de matchmaking del backend
- el backend identifica al jugador desde la sesion autenticada del socket
- busca el lobby `waiting` mas antiguo con espacio o crea uno nuevo
- el ack exitoso devuelve `playerId`, `lobbyId`, `status`, `lobbyStatus` y `reconnectToken`
- el `reconnectToken` del ack debe conservarse en cliente para `reconnect_player`

Compatibilidad temporal:

```json
{
  "nickname": "Ash"
}
```

- si se envia `nickname`, el backend lo valida pero la identidad real sale de la sesion

### `cancel_search`

Payload:

```json
{}
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
- `playerId` puede enviarse opcionalmente, pero si viene y no coincide con la sesion autenticada, responde error

### `assign_pokemon`

Payload:

```json
{
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
        "name": "Pikachu",
        "sprite": "https://example.test/pikachu.gif"
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
      "players": [
        {
          "playerId": "player-id",
          "nickname": "Ash",
          "ready": true,
          "team": [
            {
              "pokemonId": 25,
              "name": "Pikachu",
              "sprite": "https://example.test/pikachu.gif"
            }
          ]
        }
      ]
    },
    "battleStart": {
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
            "sprite": "https://example.test/pikachu.gif",
            "hp": 35,
            "currentHp": 35,
            "attack": 55,
            "defense": 40,
            "speed": 90,
            "defeated": false
          },
          "team": [
            {
              "pokemonId": 25,
              "name": "Pikachu",
              "sprite": "https://example.test/pikachu.gif",
              "hp": 35,
              "currentHp": 35,
              "attack": 55,
              "defense": 40,
              "speed": 90,
              "defeated": false
            }
          ]
        }
      ]
    }
  }
}
```

### `attack`

Payload:

```json
{
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
- si falta `battleId`, responde error de validación por ack

### `reconnect_player`

Payload:

```json
{
  "reconnectToken": "reconnect-token"
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
      "players": [
        {
          "playerId": "player-id",
          "nickname": "Ash",
          "ready": true,
          "team": [
            {
              "pokemonId": 25,
              "name": "Pikachu",
              "sprite": "https://example.test/pikachu.gif"
            }
          ]
        }
      ]
    },
    "battleState": {
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
            "sprite": "https://example.test/pikachu.gif",
            "hp": 35,
            "currentHp": 18,
            "attack": 55,
            "defense": 40,
            "speed": 90,
            "defeated": false
          },
          "team": [
            {
              "pokemonId": 25,
              "name": "Pikachu",
              "sprite": "https://example.test/pikachu.gif",
              "hp": 35,
              "currentHp": 18,
              "attack": 55,
              "defense": 40,
              "speed": 90,
              "defeated": false
            }
          ]
        }
      ]
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
          "name": "Pikachu",
          "sprite": "https://example.test/pikachu.gif"
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
        "sprite": "https://example.test/pikachu.gif",
        "hp": 35,
        "currentHp": 35,
        "attack": 55,
        "defense": 40,
        "speed": 90,
        "defeated": false
      },
      "team": [
        {
          "pokemonId": 25,
          "name": "Pikachu",
          "sprite": "https://example.test/pikachu.gif",
          "hp": 35,
          "currentHp": 35,
          "attack": 55,
          "defense": 40,
          "speed": 90,
          "defeated": false
        }
      ]
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
    "sprite": "https://example.test/charizard.gif",
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
- `Invalid reconnect token`

## Errores de validación comunes

- `nickname is required`
- `nickname must be at most 30 characters`
- `playerId is required`
- `lobbyId is required`
- `battleId is required`
- `reconnectToken is required`

## Alcance

Esta documentacion cubre el contrato actual implementado en el backend.

No cubre:

- autenticacion HTTP REST por bearer token
- autorizacion
- namespaces adicionales de Socket.IO
- versionado de eventos
