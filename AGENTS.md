# AGENTS.md

Repo root for all commands.

## Architecture

Site = SolidJS, `strictest` everywhere.

## Commands

```sh
bun install
bunx astro sync          # fresh clone first
bun run dev              # :4321
bun run build            # needs OG_IMAGE_SECRET
bun run lint
bun run typecheck
bun test src             # unit only — bare `bun test` picks up e2e
bun run test             # playwright — build first
```

## Gotchas

1. `editor-atoms.css` stays global — class names in saved HTML + localStorage.
3. MDX strict — raw `<` `{` must escape. use `/editor` route.
4. `resolveTrackProps()` in `src/editor/track-props.ts` — Track prop source of truth.
