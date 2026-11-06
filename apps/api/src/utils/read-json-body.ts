import { IncomingMessage } from "node:http";


export async function readJsonBody(request: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    const maxBytes = 64 * 1024;

    for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk);

        totalBytes += buffer.length;

        if (totalBytes > maxBytes) {
            throw new Error('BODY_TOO_LARGE');
        }

        chunks.push(buffer);
    }

    const body = Buffer.concat(chunks).toString('utf8');

    try {
        return JSON.parse(body);
    } catch {
        throw new Error('INVALID_JSON');
    }
}