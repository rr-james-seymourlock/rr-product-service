# API Documentation

This directory contains the auto-generated API documentation for the RR Product Service.

## Files

- **openapi.json** - OpenAPI 3.1 specification generated from Zod schemas
- **index.html** - Redoc documentation viewer

## Viewing Documentation

### Local Development

Start the documentation server:

```bash
pnpm run docs:serve
```

Then open http://localhost:8080 in your browser.

### Generating OpenAPI Spec

The OpenAPI specification is generated from Zod schemas in the contract files:

```bash
pnpm run docs:generate
```

This ensures the API documentation always stays in sync with the runtime validation logic.

## API Endpoints

### GET /health

Health check endpoint for monitoring and load balancer probes.

**Response:**

```json
{
  "status": "healthy",
  "service": "rr-product-service",
  "timestamp": "2025-11-26T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

### POST /url-analysis

Analyzes a product URL and extracts product identifiers.

**Request:**

```json
{
  "url": "https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100",
  "storeId": "optional-store-id"
}
```

**Response:**

```json
{
  "url": "https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100",
  "productIds": ["cn8490-100"],
  "count": 1
}
```

## Deployment

For production deployment, the `openapi.json` file can be:

- Served via AWS S3 + CloudFront
- Integrated with AWS API Gateway documentation
- Published to internal documentation portal
- Used with tools like Postman, Insomnia, or Bruno

## Technology

- **OpenAPI 3.1** - Industry-standard API specification
- **Zod** - TypeScript-first schema validation
- **@asteasolutions/zod-to-openapi** - Automatic OpenAPI generation from Zod schemas
- **Redoc** - Beautiful, responsive API documentation
