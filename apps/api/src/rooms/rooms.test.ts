
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Pool } from 'pg';
import { isValidId, parseId } from '../utils/ids.js';
import { handleRoomsRoutes } from './rooms.routes.js';
import { parseRoomInput, validateCapacity, validateDailyRate, validateDescription, validateRoomInput, validateRoomNumber } from './rooms.validation.js';

interface TestRoom {
    id: number;
    number: string;
    capacity: number;
    daily_rate: string;
    description: string;
    created_at: Date;
}

function roomBody(number = '101') {
    return {
        number,
        capacity: 2,
        daily_rate: 180.50,
        description: 'Quarto com varanda'
    };
}

/**
 * Simula o PostgreSQL em memória. `blocked` marca quartos com reservas (a
 * exclusão falha) e `largestGuests` guarda o maior número de hóspedes reservado
 * em cada quarto.
 */
async function withApi(run: (url: string, rooms: TestRoom[], blocked: Set<number>, largestGuests: Map<number, number>) => Promise<void>): Promise<void> {
    const rooms: TestRoom[] = [];
    const blocked = new Set<number>();
    const largestGuests = new Map<number, number>();
    let nextId = 1;

    const query = async (sql: string, values: unknown[] = []) => {
            if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) {
                return {rows: [], rowCount: 0};
            }

            if (sql.includes('FOR UPDATE')) {
                const found = rooms.filter(room => room.id === values[0]);
                return {rows: found, rowCount: found.length};
            }

            if (sql.includes('MAX(guest_count)')) {
                return {rows: [{largest: largestGuests.get(Number(values[0])) ?? 0}], rowCount: 1};
            }

            if (sql.startsWith('SELECT')) {
                return {
                    rows: [...rooms].sort((a, b) => a.number.localeCompare(b.number))
                };
            }

            if (sql.startsWith('INSERT')) {
                const [number, capacity, dailyRate, description] = values;

                if (rooms.some(room => room.number === number)) {
                    throw Object.assign(new Error('Número duplicado'), {code: '23505'});
                }

                const room: TestRoom = {
                    id: nextId++,
                    number: String(number),
                    capacity: Number(capacity),
                    daily_rate: Number(dailyRate).toFixed(2),
                    description: String(description),
                    created_at: new Date()
                };

                rooms.push(room);

                return {rows: [room], rowCount: 1};
            }

            if (sql.startsWith('UPDATE')) {
                const [number, capacity, dailyRate, description, id] = values;
                const room = rooms.find(room => room.id === id);

                if (!room) {
                    return {rows: [], rowCount: 0};
                }

                if (rooms.some(other => other.id !== id && other.number === number)) {
                    throw Object.assign(new Error('Número duplicado'), {code: '23505'});
                }

                room.number = String(number);
                room.capacity = Number(capacity);
                room.daily_rate = Number(dailyRate).toFixed(2);
                room.description = String(description);

                return {rows: [room], rowCount: 1};
            }

            if (sql.startsWith('DELETE')) {
                const id = Number(values[0]);
                const index = rooms.findIndex(room => room.id === id);

                if (index === -1) {
                    return {rows: [], rowCount: 0};
                }

                if (blocked.has(id)) {
                    throw Object.assign(new Error('Quarto possui reservas'), {code: '23503'});
                }

                rooms.splice(index, 1);

                return {rows: [], rowCount: 1};
            }

            throw new Error('Consulta não implementada no teste.');
    };

    const database = {
        query,
        connect: async () => ({query, release: () => undefined})
    } as unknown as Pool;

    const server = createServer(async (request, response) => {
        try {
            const handled = await handleRoomsRoutes(request, response, database);

            if (!handled) {
                response.writeHead(404);
                response.end();
            }
        } catch {
            if (!response.headersSent) {
                response.writeHead(500);
            }

            response.end();
        }
    });

    await new Promise<void>(resolve => {
        server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}`;

    try {
        await run(url, rooms, blocked, largestGuests);
    } finally {
        await new Promise<void>((resolve, reject) => {
            server.close(error => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
}

async function send(url: string, method: string, body?: unknown): Promise<Response> {
    return fetch(url, {
        method,
        headers: {'Content-Type': 'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body)
    });
}

test('Deve validar a capacidade do quarto', () => {
    assert.equal(validateCapacity(1), true);
    assert.equal(validateCapacity(4), true);
    assert.equal(validateCapacity(0), false);
    assert.equal(validateCapacity(5), false);
    assert.equal(validateCapacity(1.5), false);
    assert.equal(validateCapacity('2'), false);
});

test('Deve validar o número do quarto', () => {
    assert.equal(validateRoomNumber('101'), true);
    assert.equal(validateRoomNumber(' 101 '), true);
    assert.equal(validateRoomNumber(''), false);
    assert.equal(validateRoomNumber('   '), false);
    assert.equal(validateRoomNumber('099'), false);
    assert.equal(validateRoomNumber('1001'), false);
    assert.equal(validateRoomNumber('10A'), false);
    assert.equal(validateRoomNumber(101), false);
});

test('Deve validar a diária do quarto', () => {
    assert.equal(validateDailyRate(180.50), true);
    assert.equal(validateDailyRate(0), false);
    assert.equal(validateDailyRate(-10), false);
    assert.equal(validateDailyRate(180.555), false);
    assert.equal(validateDailyRate(Infinity), false);
    assert.equal(validateDailyRate('180'), false);
});

test('Deve validar a descrição do quarto', () => {
    assert.equal(validateDescription('Quarto com varanda'), true);
    assert.equal(validateDescription(''), true);
    assert.equal(validateDescription(null), false);
    assert.equal(validateDescription(123), false);
});

test('Deve validar o ID do quarto', () => {
    assert.equal(isValidId(1), true);
    assert.equal(isValidId(2147483647), true);
    assert.equal(isValidId(0), false);
    assert.equal(isValidId(-1), false);
    assert.equal(isValidId(1.5), false);
    assert.equal(isValidId(2147483648), false);
});

test('Deve converter e validar o ID recebido pela URL', () => {
    assert.equal(parseId('1'), 1);
    assert.equal(parseId('25'), 25);
    assert.equal(parseId('0'), null);
    assert.equal(parseId('-1'), null);
    assert.equal(parseId('abc'), null);
    assert.equal(parseId('1.5'), null);
    assert.equal(parseId('2147483648'), null);
});

test('Deve validar os dados de cadastro do quarto', () => {
    assert.equal(validateRoomInput(roomBody()), true);
    assert.equal(validateRoomInput({...roomBody(), capacity: 5}), false);
    assert.equal(validateRoomInput({...roomBody(), daily_rate: -10}), false);
    assert.equal(validateRoomInput({...roomBody(), number: ''}), false);
    assert.equal(validateRoomInput({...roomBody(), description: null}), false);
    assert.equal(validateRoomInput(null), false);
    assert.equal(validateRoomInput([]), false);
});

test('Deve informar qual campo do quarto está inválido', () => {
    assert.deepEqual(parseRoomInput({...roomBody(), number: '  '}), {ok: false, error: 'Informe o número do quarto.'});
    assert.deepEqual(parseRoomInput({...roomBody(), number: '10A'}), {ok: false, error: 'O número do quarto deve ter 3 dígitos, de 100 a 999.'});
    assert.deepEqual(parseRoomInput({...roomBody(), capacity: 5}), {ok: false, error: 'A capacidade deve ser um número inteiro de 1 a 4 hóspedes.'});
    assert.deepEqual(parseRoomInput({...roomBody(), daily_rate: 0}), {ok: false, error: 'A diária deve ser um valor positivo, com até duas casas decimais.'});
    assert.deepEqual(parseRoomInput({...roomBody(), description: 'x'.repeat(501)}), {ok: false, error: 'A descrição deve ser um texto de no máximo 500 caracteres.'});
    assert.deepEqual(parseRoomInput({...roomBody(' 101 '), description: ' Vista '}), {
        ok: true,
        input: {number: '101', capacity: 2, daily_rate: 180.50, description: 'Vista'}
    });
});

test('Deve listar os quartos mesmo com query string na URL', async () => {
    await withApi(async url => {
        const response = await send(`${url}/api/rooms?ordem=numero`, 'GET');

        assert.equal(response.status, 200);
    });
});

test('Deve listar os quartos cadastrados', async () => {
    await withApi(async url => {
        const response = await send(`${url}/api/rooms`, 'GET');
        const data = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(data, []);
    });
});

test('Deve cadastrar um quarto', async () => {
    await withApi(async url => {
        const response = await send(`${url}/api/rooms`, 'POST', roomBody());
        const data = await response.json();

        assert.equal(response.status, 201);
        assert.equal(data.id, 1);
        assert.equal(data.number, '101');
        assert.equal(data.capacity, 2);
        assert.equal(data.daily_rate, '180.50');

        const listResponse = await send(`${url}/api/rooms`, 'GET');
        const rooms = await listResponse.json();

        assert.equal(rooms.length, 1);
    });
});

test('Deve cadastrar quarto sem descrição', async () => {
    await withApi(async url => {
        const response = await send(`${url}/api/rooms`, 'POST', {
            number: '102',
            capacity: 2,
            daily_rate: 150
        });

        const data = await response.json();

        assert.equal(response.status, 201);
        assert.equal(data.description, '');
    });
});

test('Deve remover espaços do número do quarto', async () => {
    await withApi(async url => {
        const response = await send(`${url}/api/rooms`, 'POST', roomBody(' 101 '));
        const data = await response.json();

        assert.equal(response.status, 201);
        assert.equal(data.number, '101');
    });
});

test('Deve impedir cadastro com número duplicado', async () => {
    await withApi(async url => {
        const first = await send(`${url}/api/rooms`, 'POST', roomBody());
        const second = await send(`${url}/api/rooms`, 'POST', roomBody());

        assert.equal(first.status, 201);
        assert.equal(second.status, 409);
    });
});

test('Deve rejeitar dados inválidos no cadastro', async () => {
    await withApi(async url => {
        const response = await send(`${url}/api/rooms`, 'POST', {
            number: '101',
            capacity: 5,
            daily_rate: -100,
            description: ''
        });

        assert.equal(response.status, 400);
        assert.equal((await response.json()).error, 'A capacidade deve ser um número inteiro de 1 a 4 hóspedes.');
    });
});

test('Deve rejeitar JSON inválido', async () => {
    await withApi(async url => {
        const response = await fetch(`${url}/api/rooms`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: '{"number":'
        });

        assert.equal(response.status, 400);
    });
});

test('Deve atualizar um quarto existente', async () => {
    await withApi(async url => {
        await send(`${url}/api/rooms`, 'POST', roomBody());

        const response = await send(`${url}/api/rooms/1`, 'PUT', {
            number: '102',
            capacity: 4,
            daily_rate: 250,
            description: 'Quarto atualizado'
        });

        const data = await response.json();

        assert.equal(response.status, 200);
        assert.equal(data.id, 1);
        assert.equal(data.number, '102');
        assert.equal(data.capacity, 4);
        assert.equal(data.daily_rate, '250.00');
        assert.equal(data.description, 'Quarto atualizado');
    });
});

test('Deve rejeitar atualização de quarto inexistente', async () => {
    await withApi(async url => {
        const response = await send(`${url}/api/rooms/999`, 'PUT', roomBody());

        assert.equal(response.status, 404);
    });
});

test('Deve rejeitar atualização com ID inválido', async () => {
    await withApi(async url => {
        const response = await send(`${url}/api/rooms/abc`, 'PUT', roomBody());

        assert.equal(response.status, 400);
    });
});

test('Deve impedir atualização com número duplicado', async () => {
    await withApi(async url => {
        await send(`${url}/api/rooms`, 'POST', roomBody('101'));
        await send(`${url}/api/rooms`, 'POST', roomBody('102'));

        const response = await send(`${url}/api/rooms/2`, 'PUT', roomBody('101'));

        assert.equal(response.status, 409);
    });
});

test('Deve impedir reduzir a capacidade abaixo de uma reserva existente', async () => {
    await withApi(async (url, rooms, _blocked, largestGuests) => {
        await send(`${url}/api/rooms`, 'POST', {...roomBody(), capacity: 3});
        largestGuests.set(rooms[0].id, 3);

        const response = await send(`${url}/api/rooms/1`, 'PUT', {...roomBody(), capacity: 2});
        const data = await response.json();

        assert.equal(response.status, 409);
        assert.equal(data.error, 'Não é possível reduzir a capacidade para 2: há reserva com 3 hóspedes neste quarto.');
        assert.equal(rooms[0].capacity, 3);
    });
});

test('Deve permitir capacidade igual à maior reserva do quarto', async () => {
    await withApi(async (url, rooms, _blocked, largestGuests) => {
        await send(`${url}/api/rooms`, 'POST', {...roomBody(), capacity: 4});
        largestGuests.set(rooms[0].id, 2);

        const response = await send(`${url}/api/rooms/1`, 'PUT', {...roomBody(), capacity: 2});

        assert.equal(response.status, 200);
        assert.equal(rooms[0].capacity, 2);
    });
});

test('Deve excluir um quarto existente', async () => {
    await withApi(async url => {
        await send(`${url}/api/rooms`, 'POST', roomBody());

        const response = await send(`${url}/api/rooms/1`, 'DELETE');
        const data = await response.json();

        assert.equal(response.status, 200);
        assert.equal(data.message, 'Quarto excluído com sucesso.');

        const listResponse = await send(`${url}/api/rooms`, 'GET');
        const rooms = await listResponse.json();

        assert.equal(rooms.length, 0);
    });
});

test('Deve rejeitar exclusão de quarto inexistente', async () => {
    await withApi(async url => {
        const response = await send(`${url}/api/rooms/999`, 'DELETE');

        assert.equal(response.status, 404);
    });
});

test('Deve rejeitar exclusão com ID inválido', async () => {
    await withApi(async url => {
        const response = await send(`${url}/api/rooms/abc`, 'DELETE');

        assert.equal(response.status, 400);
    });
});

test('Deve impedir exclusão de quarto com reservas', async () => {
    await withApi(async (url, rooms, blocked) => {
        await send(`${url}/api/rooms`, 'POST', roomBody());

        blocked.add(rooms[0].id);

        const response = await send(`${url}/api/rooms/1`, 'DELETE');
        const data = await response.json();

        assert.equal(response.status, 409);
        assert.equal(data.error, 'Não é possível excluir o quarto com reservas associadas.');
        assert.equal(rooms.length, 1);
    });
});
