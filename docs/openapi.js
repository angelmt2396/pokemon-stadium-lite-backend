export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Pokemon Stadium Lite Backend API',
    version: '1.0.0',
    description:
      'Documentacion REST del backend de Pokemon Stadium Lite. La capa Socket.IO se documenta por separado en docs/socket-contracts.md.',
  },
  servers: [
    {
      url: '/',
      description: 'Current server',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Health checks del backend',
    },
    {
      name: 'Player Sessions',
      description: 'Sesion ligera por nickname para autenticar HTTP y Socket.IO',
    },
    {
      name: 'Pokemon',
      description: 'Catalogo Pokemon consumido por el backend',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Verifica el estado del backend',
        responses: {
          200: {
            description: 'Backend disponible',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/player-sessions': {
      post: {
        tags: ['Player Sessions'],
        summary: 'Crea una sesion ligera basada en nickname',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreatePlayerSessionRequest',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Sesion creada correctamente',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PlayerSessionCreateResponse',
                },
              },
            },
          },
          400: {
            description: 'Nickname invalido',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },
          409: {
            description: 'Nickname ya esta siendo usado por una sesion activa',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/player-sessions/me': {
      get: {
        tags: ['Player Sessions'],
        summary: 'Carga la sesion actual autenticada por bearer token',
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          200: {
            description: 'Sesion cargada correctamente',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PlayerSessionResponse',
                },
              },
            },
          },
          401: {
            description: 'Token ausente, invalido o expirado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Player Sessions'],
        summary: 'Cierra la sesion actual autenticada por bearer token',
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          200: {
            description: 'Sesion cerrada correctamente',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ClosePlayerSessionResponse',
                },
              },
            },
          },
          401: {
            description: 'Token ausente, invalido o expirado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          409: {
            description: 'No se puede cerrar la sesion mientras hay una partida activa',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/pokemon': {
      get: {
        tags: ['Pokemon'],
        summary: 'Lista el catalogo Pokemon disponible',
        responses: {
          200: {
            description: 'Catalogo obtenido correctamente',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PokemonListResponse',
                },
              },
            },
          },
          502: {
            description: 'Respuesta invalida del proveedor externo',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          503: {
            description: 'Proveedor no disponible',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/pokemon/{id}': {
      get: {
        tags: ['Pokemon'],
        summary: 'Obtiene el detalle de un Pokemon por id',
        description:
          'Valida el parametro de entrada antes de consultar el proveedor. El id debe ser un entero positivo.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Identificador numerico del Pokemon',
            schema: {
              type: 'integer',
              minimum: 1,
            },
            example: 143,
          },
        ],
        responses: {
          400: {
            description: 'Parametro de entrada invalido',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
                examples: {
                  invalidId: {
                    value: {
                      success: false,
                      message: 'id must be a number',
                      details: {
                        field: 'id',
                        reason: 'invalid_type',
                      },
                    },
                  },
                },
              },
            },
          },
          200: {
            description: 'Detalle obtenido correctamente',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PokemonDetailResponse',
                },
              },
            },
          },
          404: {
            description: 'Pokemon no encontrado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          502: {
            description: 'Respuesta invalida del proveedor externo',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'opaque session token',
      },
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: {
            type: 'boolean',
            const: true,
          },
          data: {
            type: 'object',
            additionalProperties: false,
            properties: {
              status: {
                type: 'string',
                example: 'ok',
              },
              service: {
                type: 'string',
                example: 'pokemon-stadium-lite-backend',
              },
            },
            required: ['status', 'service'],
          },
        },
        required: ['success', 'data'],
      },
      PokemonListItem: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: {
            type: 'integer',
            example: 25,
          },
          name: {
            type: 'string',
            example: 'Pikachu',
          },
          sprite: {
            type: 'string',
            format: 'uri',
            example: 'https://example.test/pikachu.gif',
          },
        },
        required: ['id', 'name', 'sprite'],
      },
      PokemonDetail: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: {
            type: 'integer',
            example: 143,
          },
          name: {
            type: 'string',
            example: 'Snorlax',
          },
          sprite: {
            type: 'string',
            format: 'uri',
            example: 'https://example.test/snorlax.gif',
          },
          type: {
            type: 'array',
            items: {
              type: 'string',
            },
            example: ['Normal'],
          },
          hp: {
            type: 'integer',
            example: 160,
          },
          attack: {
            type: 'integer',
            example: 110,
          },
          defense: {
            type: 'integer',
            example: 65,
          },
          speed: {
            type: 'integer',
            example: 30,
          },
        },
        required: ['id', 'name', 'sprite', 'type', 'hp', 'attack', 'defense', 'speed'],
      },
      PlayerSession: {
        type: 'object',
        additionalProperties: false,
        properties: {
          playerId: {
            type: 'string',
            example: 'player-1',
          },
          nickname: {
            type: 'string',
            example: 'Ash',
          },
          sessionStatus: {
            type: 'string',
            enum: ['active', 'closed'],
            example: 'active',
          },
          playerStatus: {
            type: 'string',
            enum: ['idle', 'searching', 'in_lobby', 'battling'],
            example: 'idle',
          },
          currentLobbyId: {
            type: 'string',
            nullable: true,
            example: null,
          },
          currentBattleId: {
            type: 'string',
            nullable: true,
            example: null,
          },
        },
        required: [
          'playerId',
          'nickname',
          'sessionStatus',
          'playerStatus',
          'currentLobbyId',
          'currentBattleId',
        ],
      },
      PlayerSessionWithToken: {
        allOf: [
          {
            $ref: '#/components/schemas/PlayerSession',
          },
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              sessionToken: {
                type: 'string',
                example: 'opaque-session-token',
              },
              reconnectToken: {
                type: 'string',
                example: 'reconnect-token-1',
              },
            },
            required: ['sessionToken', 'reconnectToken'],
          },
        ],
      },
      CreatePlayerSessionRequest: {
        type: 'object',
        additionalProperties: false,
        properties: {
          nickname: {
            type: 'string',
            minLength: 1,
            maxLength: 30,
            example: 'Ash',
          },
        },
        required: ['nickname'],
      },
      PlayerSessionResponse: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: {
            type: 'boolean',
            const: true,
          },
          data: {
            $ref: '#/components/schemas/PlayerSession',
          },
        },
        required: ['success', 'data'],
      },
      PlayerSessionCreateResponse: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: {
            type: 'boolean',
            const: true,
          },
          data: {
            $ref: '#/components/schemas/PlayerSessionWithToken',
          },
        },
        required: ['success', 'data'],
      },
      ClosePlayerSessionResponse: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: {
            type: 'boolean',
            const: true,
          },
          data: {
            type: 'object',
            additionalProperties: false,
            properties: {
              closed: {
                type: 'boolean',
                const: true,
              },
            },
            required: ['closed'],
          },
        },
        required: ['success', 'data'],
      },
      PokemonListResponse: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: {
            type: 'boolean',
            const: true,
          },
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/PokemonListItem',
            },
          },
          meta: {
            type: 'object',
            additionalProperties: false,
            properties: {
              total: {
                type: 'integer',
                minimum: 0,
                example: 2,
              },
            },
            required: ['total'],
          },
        },
        required: ['success', 'data', 'meta'],
      },
      PokemonDetailResponse: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: {
            type: 'boolean',
            const: true,
          },
          data: {
            $ref: '#/components/schemas/PokemonDetail',
          },
        },
        required: ['success', 'data'],
      },
      ErrorResponse: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: {
            type: 'boolean',
            const: false,
          },
          message: {
            type: 'string',
            example: 'Pokemon provider unavailable',
          },
          details: {
            type: 'object',
            additionalProperties: true,
            nullable: true,
            example: {
              provider: 'catalog',
            },
          },
        },
        required: ['success', 'message'],
      },
      ValidationErrorResponse: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: {
            type: 'boolean',
            const: false,
          },
          message: {
            type: 'string',
            example: 'id must be a number',
          },
          details: {
            type: 'object',
            additionalProperties: false,
            nullable: true,
            properties: {
              field: {
                type: 'string',
                nullable: true,
                example: 'id',
              },
              reason: {
                type: 'string',
                example: 'invalid_type',
              },
            },
            required: ['field', 'reason'],
          },
        },
        required: ['success', 'message', 'details'],
      },
    },
  },
};
