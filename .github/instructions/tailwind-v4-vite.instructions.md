---
description: 'Tailwind CSS v4 configuration for Vite projects — CSS-first, no tailwind.config.js, @tailwindcss/vite plugin'
applyTo: 'vite.config.ts, **/*.css, **/*.tsx, **/*.ts'
---

# Tailwind CSS v4 with Vite

## Key Rules

- **NO `tailwind.config.js`** — Tailwind v4 uses CSS-first configuration
- **NO `postcss.config.js`** — The `@tailwindcss/vite` plugin handles everything
- **NO old directives** — Don't use `@tailwind base/components/utilities`

## Setup

### vite.config.ts
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

### CSS Entry (src/index.css)
```css
@import "tailwindcss";

@theme {
  /* Custom design tokens here */
}
```

## Custom Theme

All customization goes in CSS via `@theme`:
```css
@theme {
  --color-primary: oklch(0.65 0.18 250);
  --font-sans: 'Inter', system-ui, sans-serif;
  --radius-lg: 0.75rem;
}
```

## Custom Utilities
```css
@utility scrollbar-hidden {
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}
```

## Custom Variants
```css
@variant hocus (&:hover, &:focus);
```
