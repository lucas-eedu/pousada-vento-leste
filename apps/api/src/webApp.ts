import { readFile, stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { getPathname, sendJson } from './utils/http.js';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** Caminho do arquivo pedido dentro de `root`, ou null se a URL tentar sair dessa pasta. */
function resolveInside(root: string, pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const filePath = resolve(root, `.${decoded}`);
  return filePath === root || filePath.startsWith(root + sep) ? filePath : null;
}

async function sendFile(request: IncomingMessage, response: ServerResponse, filePath: string): Promise<void> {
  const content = await readFile(filePath);
  const isHashedAsset = filePath.includes(`${sep}assets${sep}`);
  response.writeHead(200, {
    'Content-Type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
    // Os arquivos de assets/ têm hash no nome; o index.html precisa sempre ser revalidado.
    'Cache-Control': isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache'
  });
  response.end(request.method === 'HEAD' ? undefined : content);
}

/**
 * Serve o build do React (apps/web/dist) na publicação, para interface e API
 * ficarem no mesmo endereço. Caminhos sem arquivo devolvem o index.html.
 * Devolve false para métodos diferentes de GET/HEAD e para rotas /api.
 */
export async function serveWebApp(request: IncomingMessage, response: ServerResponse, webDistDir: string): Promise<boolean> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;

  const pathname = getPathname(request);
  if (pathname === '/api' || pathname.startsWith('/api/')) return false;

  const root = resolve(webDistDir);
  const filePath = resolveInside(root, pathname);
  if (filePath && (await isFile(filePath))) {
    await sendFile(request, response, filePath);
    return true;
  }

  if (!filePath || extname(pathname) !== '') {
    sendJson(response, 404, { error: 'Arquivo não encontrado.' });
    return true;
  }

  await sendFile(request, response, resolve(root, 'index.html'));
  return true;
}
