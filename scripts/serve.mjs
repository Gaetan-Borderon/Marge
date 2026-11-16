import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const port = Number(process.env.PORT || 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT doit être un nombre entier entre 1 et 65535.');
  process.exit(1);
}
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Méthode non autorisée.');
    return;
  }
  let file;
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    file = resolve(root, pathname.replace(/^\/+/, '') || 'index.html');
  } catch {
    response.writeHead(400);
    response.end('Adresse invalide.');
    return;
  }
  if (!file.startsWith(root + sep)) {
    response.writeHead(403);
    response.end('Accès interdit.');
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    response.writeHead(['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code) ? 404 : 500);
    response.end('Fichier indisponible.');
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `Le port ${port} est déjà utilisé. Choisissez un autre PORT.`
    : `Impossible de démarrer le serveur : ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Marge est disponible sur http://localhost:${port}`);
  console.log('Appuyez sur Ctrl+C pour arrêter.');
});
