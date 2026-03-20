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
    },
  },
};

