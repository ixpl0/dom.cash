# Repository Guidelines

## Project Structure & Module Organization
The Nuxt 4 client lives in `app/` with pages, components, composables, and Pinia stores organized by feature. Place shared UI assets in `public/`, while scoped styles stay in `app/assets/`. Server API handlers reside in `server/api/` (named `<route>.<method>.ts`); keep business logic in `server/services/` and shared types/utilities in `shared/`. Database schema belongs in `server/db/schema.ts`, and SQL migrations in `migrations/`.

## Build, Test, and Development Commands
`pnpm build` compiles client and server into `.output/`, and `pnpm preview` serves that bundle for smoke testing. Run `pnpm typecheck` to execute the Nuxt TypeScript pipeline, and `pnpm lint` or `pnpm lint:fix` to enforce formatting.

## Coding Style & Naming Conventions
All code is TypeScript under strict mode; avoid `any` except where ESLint explicitly permits it in tests. Follow Nuxt conventions for file names, including dynamic routes like `server/api/budget/[username].get.ts`. Services should expose framework-free functions and keep request handlers thin.

## Testing Guidelines
Automated tests are currently minimal; validate behaviors through targeted unit helpers colocated with the logic they cover. When adding tests, mirror the structure of the source (e.g., `server/services/__tests__/account.spec.ts`) and use descriptive titles reflecting the business rule. Always run `pnpm typecheck` and `pnpm lint` before submitting as a baseline gate.

## Commit & Pull Request Guidelines
Commits follow Conventional Commit prefixes (`feat:`, `fix:`, `refactor:`, etc.) and should isolate coherent changes. Pull requests must include a clear summary, reproduction steps, linked issues, screenshots for visual updates, and note any DB migrations. Confirm `pnpm typecheck` and `pnpm lint` pass locally and mention any manual verification performed.

## Security & Configuration Tips
Do not commit secrets; configure runtime values through Wrangler secrets (`wrangler secret put JWT_SECRET`). Verify D1 database IDs in `wrangler.toml` before deploying, and use `pnpm db:migrate` to apply schema updates. `pnpm db:reset` irreversibly wipes local data, so take backups with `pnpm db:backup`, `pnpm db:backup:test`, or `pnpm db:backup:prod` as needed.
