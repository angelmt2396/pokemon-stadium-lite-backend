# Testing Guide

Guía de la suite de pruebas del backend.

## Objetivo

La suite está pensada para cubrir el backend en capas, desde reglas puras hasta flujos reales por HTTP y Socket.IO.

Hoy cubre:

- reglas puras de batalla
- servicios de lobby, batalla y asignación de equipos
- capa REST de Express
- flujo E2E de Socket.IO con clientes reales y matchmaking multi-lobby

## Estructura

```txt
tests/
  unit/
    battle/
    lobby/
  integration/
    battle/
    helpers/
    lobby/
  http/
    helpers/
  e2e/
    helpers/
```

## Capas

## `unit`

Prueba funciones puras y estables.

Cobertura actual:

- cálculo de daño
- aplicación de daño
- resolución del primer turno
- selección aleatoria de equipos

Ventaja:

- rápidas
- fáciles de mantener
- útiles para detectar regresiones de reglas de negocio

## `integration`

Prueba servicios con dependencias en memoria.

Cobertura actual:

- `join_lobby`
- creación de múltiples lobbies `waiting`
- nickname duplicado
- `cancel_search`
- `assign_pokemon`
- `ready`
- `attack`
- `reconnect_player`
- transiciones de estado del jugador entre `idle`, `searching`, `in_lobby` y `battling`

Ventaja:

- valida la orquestación real del backend
- evita acoplar la suite a MongoDB

## `http`

Prueba el `app` de Express levantando un servidor efímero.

Cobertura actual:

- `GET /health`
- `GET /api/v1/pokemon`
- `GET /api/v1/pokemon/:id`
- `404`
- manejo de `AppError`

Ventaja:

- valida la forma real del contrato REST
- cubre middleware, routing y envelope de respuestas

## `e2e`

Prueba Socket.IO con servidor y clientes reales.

Cobertura actual:

- `join_lobby`
- `search_match`
- `cancel_search`
- `search_status`
- `assign_pokemon`
- `match_found`
- `ready`
- `battle_start`
- `attack`
- `turn_result`
- `reconnect_player`
- creación de segundo lobby al llegar un tercer jugador
- rechazo de ataque fuera de turno
- rechazo de reconexión inválida

Ventaja:

- valida transporte real
- valida acks y eventos emitidos
- congela el flujo principal de tiempo real

## Comandos

Desde la raíz del repo:

```bash
npm test
```

Solo unit:

```bash
npm run test:unit
```

Solo integration:

```bash
npm run test:integration
```

Solo HTTP:

```bash
npm run test:http
```

Solo E2E:

```bash
npm run test:e2e
```

## Requisitos para correrlos

- `npm install`
- Node.js 18+

Notas:

- `test:http` y `test:e2e` levantan servidores locales efímeros
- por eso necesitan un entorno que permita abrir puertos locales
- no requieren MongoDB porque usan inyección o dobles en memoria donde corresponde

## Helpers importantes

- [in-memory-state.js](./integration/helpers/in-memory-state.js)
  - estado en memoria para integration tests

- [http-test-client.js](./http/helpers/http-test-client.js)
  - levanta y cierra un servidor efímero de Express

- [socket-test-harness.js](./e2e/helpers/socket-test-harness.js)
  - levanta un servidor Socket.IO de prueba y crea clientes reales

## Decisiones de diseño

- Se evitó agregar frameworks extra de testing.
- La suite usa `node:test` y `assert`.
- Para HTTP y E2E se prefirió un servidor real efímero sobre mocks profundos.
- Para integration se prefirió inyección de dependencias en vez de base de datos real.

## Qué no cubre todavía

- persistencia real con MongoDB en pruebas automatizadas
- arranque completo desde `src/server.js` con wiring productivo
- pruebas de carga o concurrencia dura

## Recomendación

Para cambios rápidos:

- corre `npm run test:unit`
- luego `npm run test:integration`

Para validar un cambio antes de cerrar:

- corre `npm test`
