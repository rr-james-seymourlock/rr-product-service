# Repository Guidelines

## Project Structure & Module Organization

`serverless.yml` declares the Lambda entry points (currently `postProduct`). TypeScript lives in `src/`: handlers (`handlers/`), shared Middy layers (`middleware/`), URL/store utilities (`lib/`), store configs (`storeConfigs/`), and schema helpers (`parseProductSchema/`). Tests live beside their modules inside `src/**/__tests__`, while validation references reside in `docs/validation-*.md`.

## Build, Test & Development Commands

- `npm run offline` – start Serverless Offline and exercise handlers locally via API Gateway-style routes.
- `npm run build` – run `sls package` to emit the `.serverless` artifact consumed by deploy.
- `npm run deploy -- --stage <stage>` – push to AWS using the OAK-authenticated profile; always set the target stage.
- `npm run typecheck`, `npm run lint`, `npm run format` – TypeScript, ESLint, and Prettier enforcement before committing.
- `npm test`, `npm run test:watch`, `npm run test:coverage` – Vitest suites in these modes.
- `npm run check` – one-shot gate that chains linting, type-checking, and tests; run before PR review.

## Coding Style & Naming Conventions

Use strict TypeScript with native ESM and the `@` alias pointing to `src/`. Prettier owns all formatting (2-space indent, width 100, single quotes, semicolons). ESLint forbids `any`, enforces explicit returns, and applies the naming rules in `eslint.config.mts` (camelCase values, PascalCase types, SCREAMING_CASE constants such as `PATTERNS`). Keep handlers thin, move validation into Zod schemas (`*.schema.ts`), and colocate shared utilities in `lib/`.

## Testing Guidelines

Write Vitest specs next to their modules using descriptive names such as `parseUrlComponents.normalization.test.ts`. Cover success paths plus failure cases (malformed URLs, missing configs). Run `npm run test:coverage` before review and keep coverage comparable to the touched module; use `npm run test:bench` whenever parser performance might regress.

## Commit & Pull Request Guidelines

Commits must follow Conventional Commits (`feat:`, `fix:`, `chore:`) enforced by Husky + Commitlint; keep each change focused and describe API impacts in the body. PRs should include a behavior summary, sample payloads if responses change, linked Jira/GitHub issues, and confirmation that `npm run check` and `npm run test:coverage` succeeded. Call out edits to `serverless.yml` or new environment variables so reviewers can verify deployment implications.

## Security & Environment Notes

Use Node 22.21.0+ (`.nvmrc`) and npm 10+. Authenticate through the OAK-backed AWS profile before running `npm run deploy`, and keep credentials, partner secrets, and customer data out of Git—load them via environment variables or AWS Parameter Store. When updating store configs or parsers, consult `docs/validation-implementation-plan.md` and `docs/ZOD_STRATEGY.md` to keep validation consistent.
