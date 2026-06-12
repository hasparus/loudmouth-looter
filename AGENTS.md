# AGENTS.md

Architectural notes for AI agents. Read before touching any file. See also
[docs/tradeoffs-and-limitations.md].

[docs/tradeoffs-and-limitations.md]: ./docs/tradeoffs-and-limitations.md

## Architecture

**Dual JSX runtime** — this is the most important thing to know:

- `src/editor/` is **React 19** — it has its own `src/editor/tsconfig.json` and
  `astro.config.ts` includes React via `react({ include: ["**/editor/**"] })`.
- Everything else (`src/`, `api/`, `e2e/`) is **SolidJS** — root
  `tsconfig.json`, `strictest` mode.
- Do not move files across the `src/editor/` boundary without updating both
  tsconfigs and the astro integration config.

**Key files** (not exhaustive — `text-editor.tsx` is the editor island,
`render/` holds the published-page atom renderers):

```
src/editor/
  editor-atoms.css      shared stylesheet (global — see Gotchas)
  editor-atoms.tsx      Track / Line / Move React components
  editor-dom.tsx        contenteditable editor core
  editor-files.ts       File System Access API open/save helpers
  editor-help-modal.tsx slash-menu documentation UI
  editor-mdx.ts         htmlToMdx / mdxToHtml serializer
  editor-mdx.test.ts    unit tests for serializer round-trips
  slash-menu.tsx        slash-command UI
  track-props.ts        resolveTrackProps() — framework-free, shared
  track-props.test.ts   unit tests for Track prop resolution
  use-linked-file.ts    React hook bridging editor ↔ file system
  tsconfig.json         React-specific tsconfig (strict, JSX react-jsx)
```

## Commands

Run all commands from the repo root.

```sh
bun install                              # install deps
bunx astro sync                          # generate content types (do this first in fresh clones)
bun run dev                              # dev server → http://localhost:4321
bun run build                            # production build (needs OG_IMAGE_SECRET)
bun run preview                          # serve the build locally
bun run lint                             # ESLint, zero warnings allowed
bun run typecheck                        # astro check + tsc (Solid) + tsc (React/editor)
bun run format                           # prettier write
bun run ci                               # lint + prettier check (local pre-push gate; CI runs the steps separately)
bun test src                             # unit tests — ALWAYS scope to src/
bun run test                             # playwright e2e — needs bun run build first
```

## Gotchas

1. **`editor-atoms.css` must stay global.** Class names are persisted in saved
   HTML and in localStorage. Converting it to CSS Modules would break any
   previously saved content.

2. **Dual JSX runtimes.** New `.tsx` files under `src/editor/` are React.
   Everywhere else is Solid. Mixing them silently breaks runtime behavior. Check
   `src/editor/tsconfig.json` and `astro.config.ts` before adding files.

3. **Always run `bunx astro sync` first** in a fresh clone. `bun run typecheck`
   calls `astro check` which needs the generated content types.

4. **MDX is strict.** Raw `<` and `{` in post text must be escaped. Prefer
   writing posts via the `/editor` route to avoid hand-escaping.

5. **Scope unit tests to `src/`.** `bun test src` runs only the bun:test specs.
   Bare `bun test` also picks up Playwright specs in `e2e/` and fails outside CI
   context.

## Testing

**Unit tests** (`bun test src`) — co-located `.test.ts` files in `src/`. Key
files: `editor-mdx.test.ts` (serializer round-trips), `track-props.test.ts`.

**E2e / visual regression** (`bun run test`) — Playwright in `e2e/`. Requires a
production build (`bun run build`). Playwright's `webServer` runs `preview`.

**Visual-regression snapshots** are per-platform. Darwin and Linux snapshots are
both committed. To regenerate Linux snapshots, run inside a
`mcr.microsoft.com/playwright` container or pull them from CI artifacts (the
workflow uploads them on failure).

## CI & deploy

`.github/workflows/ci.yml` steps: lint → typecheck → unit tests → build → e2e →
Vercel deploy → Lighthouse.

Vercel deploy is gated on `HAS_VERCEL` (`secrets.VERCEL_TOKEN` must be set).
Required secrets: `OG_IMAGE_SECRET`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
`VERCEL_PROJECT_ID`.

## Track atom prop semantics

`resolveTrackProps()` in `src/editor/track-props.ts` is the single source of
truth, shared by editor and published pages:

| Prop           | Meaning                                             |
| :------------- | :-------------------------------------------------- |
| `value`        | Static fill — wins over `defaultValue`              |
| `defaultValue` | Interactive fill (ephemeral, not persisted to file) |
| `max`          | Total cells, 1–12 (default 1)                       |
| `filled`       | Parse-only legacy alias for `value`                 |
| `total`        | Parse-only legacy alias for `max`                   |
