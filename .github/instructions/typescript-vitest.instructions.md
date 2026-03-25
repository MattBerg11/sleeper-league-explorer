---
description: 'TypeScript and Vitest coding standards for the Sleeper League Explorer monorepo'
applyTo: '**/*.ts, **/*.tsx'
---

# TypeScript Standards

## Language

- TypeScript 5.x, strict mode, ES2022 target
- NEVER use `any` — use `unknown` and narrow, or define proper types
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use `const` by default, `let` only when reassignment is needed
- No `var`, no `enum` (use `as const` objects instead)

## Async

- Always use `async/await` — no raw `.then()` chains
- Handle errors with try/catch, not `.catch()`
- Use `Promise.all()` for parallel operations

## Exports

- Named exports only — no default exports
- Barrel exports via `index.ts` in packages

## Validation

- Use Zod for all external data validation
- Prefer `safeParse` over `parse` — handle failures gracefully
- Define schemas in `packages/shared/src/schemas.ts`
- Derive TypeScript types from Zod: `type Player = z.infer<typeof playerSchema>`

## Testing (Vitest)

- Test files: `*.test.ts` or `*.test.tsx` co-located with source
- Use `describe`/`it` blocks
- Mock external dependencies with `vi.mock()`
- No comments in tests unless explaining non-obvious assertions

## Imports

- Use `@/` alias in apps
- Use `@sleeper-explorer/shared` for cross-package imports
- Group imports: external → shared package → internal → types
