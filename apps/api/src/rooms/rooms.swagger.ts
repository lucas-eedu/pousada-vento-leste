
import type { IncomingMessage, ServerResponse } from 'node:http';

const roomSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer', example: 1 },
        number: { type: 'string', example: '101' },
        capacity: { type: 'integer', example: 2 },
        daily_rate: { type: 'string', example: '180.50' },
        description: { type: 'string', example: 'Quarto com varanda' },
        created_at: { type: 'string', format: 'date-time' }
    }
};

const roomInputSchema = {
    type: 'object',
    required: ['number', 'capacity', 'daily_rate'],
    properties: {
        number: { type: 'string', example: '101' },
        capacity: { type: 'integer', minimum: 1, maximum: 4, example: 2 },
        daily_rate: { type: 'number', minimum: 0.01, maximum: 99999999.99, multipleOf: 0.01, example: 180.50 },
        description: { type: 'string', default: '', example: 'Quarto com varanda' }
    }
};

const errorSchema = {
    type: 'object',
    properties: {
        error: { type: 'string' }
    }
};

const idParameter = {
    name: 'id',
    in: 'path',
    required: true,
    description: 'Identificador numérico do quarto.',
    schema: {
        type: 'string',
        pattern: '^[0-9]+$',
        example: '1'
    }
};

const openApiDocument = {
    openapi: '3.0.3',
    info: {
        title: 'Pousada Vento Leste - Quartos',
        version: '1.0.0',
        description: 'Documentação das operações de cadastro, listagem, atualização e exclusão de quartos.'
    },
    tags: [
        {
            name: 'Quartos',
            description: 'Gerenciamento dos quartos da pousada.'
        }
    ],
    paths: {
        '/api/rooms': {
            get: {
                tags: ['Quartos'],
                summary: 'Listar todos os quartos',
                responses: {
                    '200': {
                        description: 'Quartos encontrados.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: roomSchema
                                }
                            }
                        }
                    },
                    '500': {
                        description: 'Erro interno do servidor.'
                    }
                }
            },
            post: {
                tags: ['Quartos'],
                summary: 'Cadastrar um quarto',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: roomInputSchema
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'Quarto cadastrado com sucesso.',
                        content: {
                            'application/json': {
                                schema: roomSchema
                            }
                        }
                    },
                    '400': {
                        description: 'Dados inválidos.',
                        content: {
                            'application/json': {
                                schema: errorSchema
                            }
                        }
                    },
                    '409': {
                        description: 'Número de quarto já cadastrado.',
                        content: {
                            'application/json': {
                                schema: errorSchema
                            }
                        }
                    },
                    '413': {
                        description: 'Corpo da requisição muito grande.'
                    },
                    '500': {
                        description: 'Erro interno do servidor.'
                    }
                }
            }
        },
        '/api/rooms/{id}': {
            put: {
                tags: ['Quartos'],
                summary: 'Atualizar um quarto',
                parameters: [idParameter],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: roomInputSchema
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Quarto atualizado com sucesso.',
                        content: {
                            'application/json': {
                                schema: roomSchema
                            }
                        }
                    },
                    '400': {
                        description: 'ID ou dados inválidos.',
                        content: {
                            'application/json': {
                                schema: errorSchema
                            }
                        }
                    },
                    '404': {
                        description: 'Quarto não encontrado.',
                        content: {
                            'application/json': {
                                schema: errorSchema
                            }
                        }
                    },
                    '409': {
                        description: 'Número de quarto já cadastrado.',
                        content: {
                            'application/json': {
                                schema: errorSchema
                            }
                        }
                    },
                    '413': {
                        description: 'Corpo da requisição muito grande.'
                    },
                    '500': {
                        description: 'Erro interno do servidor.'
                    }
                }
            },
            delete: {
                tags: ['Quartos'],
                summary: 'Excluir um quarto',
                parameters: [idParameter],
                responses: {
                    '200': {
                        description: 'Quarto excluído com sucesso.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: {
                                            type: 'string',
                                            example: 'Quarto excluído com sucesso.'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '400': {
                        description: 'ID inválido.',
                        content: {
                            'application/json': {
                                schema: errorSchema
                            }
                        }
                    },
                    '404': {
                        description: 'Quarto não encontrado.',
                        content: {
                            'application/json': {
                                schema: errorSchema
                            }
                        }
                    },
                    '409': {
                        description: 'Não é possível excluir um quarto com reservas associadas.',
                        content: {
                            'application/json': {
                                schema: errorSchema
                            }
                        }
                    },
                    '500': {
                        description: 'Erro interno do servidor.'
                    }
                }
            }
        }
    }
};

export function handleSwaggerRoutes(request: IncomingMessage, response: ServerResponse): boolean {
    if (request.method === 'GET' && request.url === '/api/rooms/openapi.json') {
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify(openApiDocument));
        return true;
    }

    if (request.method === 'GET' && request.url === '/api/rooms/docs') {
        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Pousada Vento Leste - Swagger Quartos</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {
            SwaggerUIBundle({
                url: '/api/rooms/openapi.json',
                dom_id: '#swagger-ui'
            });
        };
    </script>
</body>
</html>`;

        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(html);
        return true;
    }

    return false;
}
