/* eslint-env node */
/**
 * Local development server for testing Lambda functions without Docker/SAM
 *
 * Uses Node's built-in http module to simulate API Gateway locally
 */
import { createServer } from 'node:http';
import { URL } from 'node:url';
import { healthCheckHandler } from './src/functions/health/handler.ts';
import { createUrlAnalysisHandler } from './src/functions/create-url-analysis/handler.ts';

const PORT = 3000;

// Helper to convert HTTP request to API Gateway event format
const createApiGatewayEvent = (req, pathname, body = null) => ({
  httpMethod: req.method,
  path: pathname,
  headers: req.headers,
  queryStringParameters: null,
  pathParameters: null,
  body,
  isBase64Encoded: false,
  multiValueHeaders: {},
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {},
  resource: '',
});

const server = createServer((req, res) => {
  // Parse URL
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // Collect request body for POST requests
  if (req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      // Route POST requests
      let result;

      if (pathname === '/url-analysis') {
        const event = createApiGatewayEvent(req, pathname, body);
        result = createUrlAnalysisHandler(event);
      } else {
        result = {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Not Found', message: `No route matches ${req.method} ${pathname}` }),
        };
      }

      // Send response
      res.statusCode = result.statusCode;
      if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
      }
      res.end(result.body);
    });
  } else {
    // Route GET requests
    let result;

    if (pathname === '/health' && req.method === 'GET') {
      const event = createApiGatewayEvent(req, pathname);
      result = healthCheckHandler(event);
    } else {
      result = {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Not Found', message: `No route matches ${req.method} ${pathname}` }),
      };
    }

    // Send response
    res.statusCode = result.statusCode;
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }
    res.end(result.body);
  }
});

server.listen(PORT, () => {
  /* eslint-disable no-undef */
  console.log('\n🚀 Local API server running!');
  console.log(`\n📍 Endpoints:`);
  console.log(`   GET  /health         - Health check`);
  console.log(`   POST /url-analysis   - Analyze URL and extract product IDs`);
  console.log(`\n💡 Examples:`);
  console.log(`   curl "http://localhost:${PORT}/health"`);
  console.log(`   curl -X POST "http://localhost:${PORT}/url-analysis" \\`);
  console.log(`        -H "Content-Type: application/json" \\`);
  console.log(`        -d '{"url":"https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100"}'`);
  console.log(`\n✨ Press Ctrl+C to stop\n`);
  /* eslint-enable no-undef */
});
