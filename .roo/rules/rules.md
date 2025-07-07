# Roo Code Cloud - Development Guidelines

## Testing & Formatting

- **Test**: `pnpm test` (runs all tests via Turbo)
- **Lint**: `pnpm lint` (ESLint with TypeScript support)
- **Type check**: `pnpm check-types`
- **Format**: Files are auto-formatted on commit via lint-staged

## Database & Migrations

- **Push schema**: `pnpm db:push` (applies schema directly, no migration files)
- **Generate migration**: `pnpm --filter @roo-code-cloud/db db:generate`
- **Run migrations**: `pnpm --filter @roo-code-cloud/db db:migrate`
- **Reset DB**: `pnpm db:reset` (drops all data and recreates)
- **Schema location**: `packages/db/src/schema.ts`
- **Migration files**: `packages/db/drizzle/*.sql`

## Code Style

- **TypeScript**: Strict mode enabled, use explicit types
- **Imports**: Use absolute imports with `@/` for src directory
- **Async/Await**: Prefer over promises, use try-catch for error handling
- **Naming**: camelCase for variables/functions, PascalCase for types/components
- **Comments**: Use JSDoc for public APIs, inline comments for complex logic
- **Error Handling**: Return discriminated unions `{ success: true; data: T } | { success: false; error: string }` for actions
- **Database**: Use Drizzle ORM with type-safe queries
- **Testing**: Vitest with globals, mock external dependencies
- **React**: Functional components with hooks, server components by default
- **Formatting**: Prettier with default settings (via lint-staged)
