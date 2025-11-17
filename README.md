# Product Service API

A serverless microservice for product management built with TypeScript, AWS Lambda, and the Serverless Framework.

## Overview

This service provides API endpoints for managing product data, including:

- Creating new products
- Extracting product IDs from URLs
- Validating product data

## Technologies

- TypeScript
- AWS Lambda
- Serverless Framework
- Middy middleware
- Zod validation
- DynamoDB (planned)

## Prerequisites

- Node.js 18+
- AWS CLI configured with appropriate credentials
- OAK (Rakuten AWS auth)
- Serverless Framework CLI (3.x)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Development

### Local Development

Start the service locally:

```bash
npm run offline
```

This will start the Serverless Offline server, allowing you to test your Lambda functions locally.

### Testing

Run tests:

```bash
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
```

### Linting and Formatting

```bash
npm run lint       # Check for linting issues
npm run lint:fix   # Fix linting issues
npm run format     # Format code with Prettier
```

## Deployment

Deploy to AWS:

```bash
npm run deploy             # Deploy to default stage
npm run deploy -- --stage prod  # Deploy to production stage
```

## Project Structure

src/
├── handlers/ # Lambda handlers
├── middleware/ # Custom middleware
│ └── validation/ # Zod validators
├── services/ # Business logic
├── storeConfigs/ # Store configuration
├── parseUrlComponents/ # URL parsing utilities
└── types/ # TypeScript type definitions

## Available Commands

| Command             | Description              |
| ------------------- | ------------------------ |
| `npm run build`     | Package the service      |
| `npm run deploy`    | Deploy to AWS            |
| `npm run offline`   | Run locally              |
| `npm test`          | Run tests                |
| `npm run lint`      | Check for linting issues |
| `npm run format`    | Format code              |
| `npm run typecheck` | Check TypeScript types   |

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Write tests for your changes
4. Ensure all tests pass
5. Commit using conventional commit format
6. Create a pull request
