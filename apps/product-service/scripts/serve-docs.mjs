/* eslint-env node */
/**
 * Simple HTTP server for viewing API documentation locally
 *
 * Serves the docs directory on http://localhost:8080
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* eslint-disable no-undef */
const __dirname = fileURLToPath(new URL('.', import.meta.url));
/* eslint-enable no-undef */
const DOCS_DIR = join(__dirname, '../docs');
const PORT = 8080;

// MIME types for common file extensions
const MIME_TYPES = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  try {
    // Default to index.html for root path
    let filePath = req.url === '/' ? '/index.html' : req.url;

    // Remove query params
    filePath = filePath.split('?')[0];

    const fullPath = join(DOCS_DIR, filePath);
    const content = await readFile(fullPath);
    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
    }
  }
});

server.listen(PORT, () => {
  /* eslint-disable no-undef */
  console.log('\n📚 API Documentation Server');
  console.log(`\n🌐 Open in browser: http://localhost:${PORT}`);
  console.log('\n✨ Press Ctrl+C to stop\n');
  /* eslint-enable no-undef */
});
