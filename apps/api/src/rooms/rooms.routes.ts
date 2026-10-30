import type{ IncomingMessage, ServerResponse } from 'node:http';
export async function handlerRoomsRoutes(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
        if(request.method === 'GET' && request.url === '/api/rooms'){
                response.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
                response.end(JSON.stringify([]));

                return true;
        }
        return false;
}