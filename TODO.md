# TODO

## Restore post-fixture coverage with future blog posts

The old `/features/*` fixture posts are gone, so e2e now targets the live
`/why-dragon/` post and the visual-regression suite is opt-in via
`RUN_VISUAL_REGRESSION=1` until fresh snapshots exist. Add coverage back as
future posts exercise these cases:

- [ ] Shiki / Twoslash code blocks with syntax-colored spans.
- [ ] Frontmatter-driven date/image rendering beyond the default live post.
- [ ] Markdown kitchen-sink rendering: tables, task lists, blockquotes, code
      fences, footnotes, sub/sup, images, and links.
- [ ] Published editor atoms fixture with all Track shapes, task-list checked
      state, chevron lines, and interactive `defaultValue` track toggles.
- [ ] Per-platform visual snapshots for new canonical posts, especially Linux CI
      snapshots for `/why-dragon/`.
- [ ] Per-platform index snapshots after the post list and homepage height
      settle.
- [ ] Agent endpoints and Lighthouse URLs covering more than one post once more
      public posts exist.

## Migrate editor from React to Solid — done

The editor cluster (`src/editor`) was the last React in the app. All of it is
now Solid; the `@astrojs/react` integration and `react`/`react-dom` deps are
gone. e2e coverage (`e2e/editor.spec.ts`, `e2e/site.spec.ts`) locks the behavior
and passes on the Solid build.

- [x] `src/editor/editor-atoms.tsx` — `TrackPreview` → `<Index>`
- [x] `src/editor/use-linked-file.tsx` — `createStore` with getters (keeps
      `file.name` access reactive)
- [x] `src/editor/slash-menu.tsx`
- [x] `src/editor/editor-help-modal.tsx`
- [x] `src/editor/move-card.tsx`
- [x] `src/editor/text-editor.tsx`
- [x] `astro.config.ts` — dropped `react()`, `solidJs()` now handles everything
- [x] `src/editor/tsconfig.json` — Solid JSX runtime
- [x] `src/pages/editor.astro` — `client:only="solid-js"`
- [x] removed `@astrojs/react`, `react`, `react-dom`, `@types/react-dom`

`@types/react` (devDep) stays: `api/og.ts` uses `@vercel/og`, whose
`ImageResponse` API is React-typed. That's an edge function, not a UI component
— not part of this migration.

## Pre-existing (not touched here)

`bun run lint` fails on `src/lib/Commands.tsx` (solid/no-destructure,
solid/prefer-for) plus warnings in other `src/lib` Solid components. These
predate this branch.
