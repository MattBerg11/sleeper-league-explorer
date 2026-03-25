---
description: 'GitHub Actions CI/CD best practices — SHA pinning, caching, permissions, pnpm workflows'
applyTo: '.github/workflows/*.yml, .github/workflows/*.yaml'
---

# GitHub Actions Best Practices

## Mandatory Rules

1. **SHA Pin ALL actions** with version comment:
   ```yaml
   uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
   ```
   NEVER use `@v4`, `@main`, or `@latest`.

2. **Least privilege permissions**:
   ```yaml
   permissions:
     contents: read
   ```
   Add write permissions only at job level where needed.

3. **Frozen lockfile**:
   ```yaml
   run: pnpm install --frozen-lockfile
   ```

## pnpm Setup Pattern

```yaml
- name: Install pnpm
  uses: pnpm/action-setup@a7487c7e89a18df4991f7f222e4898a00d66ddda # v4.1.0

- name: Setup Node.js
  uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
  with:
    node-version: 22
    cache: 'pnpm'

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

## Caching

Use pnpm store caching:
```yaml
key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
restore-keys: ${{ runner.os }}-pnpm-
```

## Concurrency

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Timeouts

Always set `timeout-minutes`:
- Build/test: 15 minutes
- Sync/ETL: 10 minutes
- Deploy: 10 minutes
