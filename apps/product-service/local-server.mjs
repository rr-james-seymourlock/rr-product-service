/* eslint-env node */
/**
 * Local development server for testing Lambda functions without Docker/SAM
 *
 * Uses Node's built-in http module to simulate API Gateway locally.
 * Routes are defined in a registry pattern for easy scaling.
 */
import { createServer } from 'node:http';
import { URL } from 'node:url';
import { convertAsinHandler } from './src/functions/convert-asin/handler.ts';
import { fetchImagesHandler } from './src/functions/fetch-images/handler.ts';
import { healthCheckHandler } from './src/functions/health/handler.ts';
import { createUrlAnalysisHandler } from './src/functions/create-url-analysis/handler.ts';
import { normalizeCartViewsHandler } from './src/functions/normalize-cart-views/handler.ts';
import { normalizeProductViewsHandler } from './src/functions/normalize-product-views/handler.ts';

const PORT = 3000;

/**
 * Route registry - add new routes here
 *
 * To add a new endpoint, just import the handler and add one line:
 * { method: 'GET', path: '/my-endpoint', handler: myHandler, description: 'My endpoint' }
 */
const ROUTES = [
  {
    method: 'GET',
    path: '/health',
    handler: healthCheckHandler,
    description: 'Health check',
  },
  {
    method: 'POST',
    path: '/product-identifiers/urls',
    handler: createUrlAnalysisHandler,
    description: 'Extract product identifiers from URLs (1-100 URLs)',
    example: `curl -X POST "http://localhost:${PORT}/product-identifiers/urls" \\
     -H "Content-Type: application/json" \\
     -d '{"urls":[{"url":"https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100"},{"url":"https://www.target.com/p/example-product/-/A-12345678"}]}'`,
  },
  {
    method: 'POST',
    path: '/product-identifiers/asins',
    handler: convertAsinHandler,
    description: 'Convert ASINs to product identifiers (GTINs/UPC, MPN, SKU)',
    example: `curl -X POST "http://localhost:${PORT}/product-identifiers/asins" \\
     -H "Content-Type: application/json" \\
     -d '{"asins":["B0FQFB8FMG"]}'`,
  },
  {
    method: 'POST',
    path: '/cart-events/normalize',
    handler: normalizeCartViewsHandler,
    description: 'Normalize cart events and extract product IDs (1-100 events)',
    example: `curl -X POST "http://localhost:${PORT}/cart-events/normalize" \\
     -H "Content-Type: application/json" \\
     -d '{"events":[{"store_id":8333,"store_name":"Macys","product_list":[{"name":"Sweater","url":"https://macys.com/product?ID=12345","item_price":4900}]}]}'`,
  },
  {
    method: 'POST',
    path: '/product-events/normalize',
    handler: normalizeProductViewsHandler,
    description: 'Normalize product view events and consolidate IDs (1-100 events)',
    example: `curl -X POST "http://localhost:${PORT}/product-events/normalize" \\
     -H "Content-Type: application/json" \\
     -d '{"events":[{"store_id":5246,"store_name":"target.com","name":"T-Shirt","url":"https://www.target.com/p/-/A-88056717","sku":["88056717"]}]}'`,
  },
  {
    method: 'POST',
    path: '/images/fetch',
    handler: fetchImagesHandler,
    description: 'Fetch and store product images (1-100 requests)',
    example: `curl -X POST "http://localhost:${PORT}/images/fetch" \\
     -H "Content-Type: application/json" \\
     -d '{"requests":[{"storeId":"8333","productUrl":"https://www.macys.com/shop/product/12345","imageUrl":"https://slimages.macysassets.com/is/image/MCY/products/2/optimized/31898232_fpx.tif"}]}'`,
  },
];

/**
 * Find matching route for method and path
 */
const findRoute = (method, path) => {
  return ROUTES.find((route) => route.method === method && route.path === path);
};

/**
 * Convert HTTP request to API Gateway event format
 */
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

/**
 * Send HTTP response
 */
const sendResponse = (res, result) => {
  res.statusCode = result.statusCode;
  if (result.headers) {
    Object.entries(result.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }
  res.end(result.body);
};

/**
 * Handle incoming requests
 */
const handleRequest = (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // For POST/PUT/PATCH requests, collect body first
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      const route = findRoute(method, pathname);

      if (route) {
        const event = createApiGatewayEvent(req, pathname, body);
        const result = await route.handler(event);
        sendResponse(res, result);
      } else {
        sendResponse(res, {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Not Found',
            message: `No route matches ${method} ${pathname}`,
          }),
        });
      }
    });
  } else {
    // For GET/DELETE requests, handle immediately
    const route = findRoute(method, pathname);

    if (route) {
      const event = createApiGatewayEvent(req, pathname);
      const result = route.handler(event);
      sendResponse(res, result);
    } else {
      sendResponse(res, {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Not Found',
          message: `No route matches ${method} ${pathname}`,
        }),
      });
    }
  }
};

const server = createServer(handleRequest);

server.listen(PORT, () => {
  /* eslint-disable no-undef */
  console.log('\n🚀 Local API server running!');
  console.log(`\n📍 Endpoints:`);

  // Auto-generate endpoint list from routes
  ROUTES.forEach((route) => {
    const methodPadded = route.method.padEnd(6);
    const pathPadded = route.path.padEnd(20);
    console.log(`   ${methodPadded}${pathPadded}- ${route.description}`);
  });

  console.log(`\n💡 Examples:`);
  console.log(`   curl "http://localhost:${PORT}/health"`);

  // Show example for routes that have one
  const routeWithExample = ROUTES.find((r) => r.example);
  if (routeWithExample) {
    console.log(`   ${routeWithExample.example}`);
  }

  console.log(`\n✨ Press Ctrl+C to stop\n`);
  /* eslint-enable no-undef */
});
