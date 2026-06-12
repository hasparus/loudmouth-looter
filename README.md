# loudmouth-looter

Personal site with a rich-text MDX editor, live at [lol.haspar.us]. Scaffolded
from [zaduma] — an Astro starter for understated personal websites.

[lol.haspar.us]: https://lol.haspar.us
[zaduma]: https://github.com/hasparus/zaduma

## Quick start

```sh
bun install
cp .env.example .env.local   # fill in OG_IMAGE_SECRET (placeholder is fine locally)
bun run dev                  # → http://localhost:4321
# open http://localhost:4321/editor to try the MDX editor
```

## The editor

`/editor` is a contenteditable React island backed by the File System Access API
— open a `.mdx` post, edit, save. No server round-trips.

- **Slash menu**: type `/squares 4` (or `/circles`, `/rhombs`) to insert a Track
  atom; `/arrow` and `/chevron` insert marker lines. Move cards are authored as
  `<Move>` blocks in MDX.
- **GFM tasks**: type `- [ ] ` to start an interactive task list.
- **Track props**: `value` (static fill), `defaultValue` (interactive,
  ephemeral), `max` (1–12). `value` beats `defaultValue`; `filled`/`total` are
  legacy parse-only aliases.
- Atoms render identically in the editor and on published pages via the shared
  stylesheet `src/editor/editor-atoms.css`.

## Commands

| Command             | Action                                                                  |
| :------------------ | :---------------------------------------------------------------------- |
| `bun run dev`       | Dev server at `localhost:4321`                                          |
| `bun run build`     | Production build to `./dist/` (needs `OG_IMAGE_SECRET`)                 |
| `bun run preview`   | Preview the production build locally                                    |
| `bun run lint`      | ESLint (zero warnings allowed)                                          |
| `bun run typecheck` | `astro check` + two `tsc` passes (Solid + React)                        |
| `bun run format`    | Prettier write                                                          |
| `bun run ci`        | lint + prettier check (what CI runs pre-build)                          |
| `bun test src`      | Unit tests (always scope to `src`; bare `bun test` runs Playwright too) |
| `bun run test`      | Playwright e2e (requires `bun run build` first)                         |

## Project structure

```
posts/              MDX blog posts
public/             static assets
src/
  build-time/       remark/rehype plugins
  editor/           React 19 rich-text editor (File System Access API)
  global-styles/    fonts, body, prose
  layouts/          BaseLayout.astro, PostLayout.astro
  lib/              shared utils and UI components (SolidJS)
  pages/            Astro routes
api/                Vercel serverless functions
e2e/                Playwright visual-regression + e2e tests
```

## Deploying

CI (`/.github/workflows/ci.yml`) runs lint → typecheck → unit tests → build →
e2e → Vercel deploy → Lighthouse.

Secrets required in GitHub Actions:

| Secret              | Purpose                              |
| :------------------ | :----------------------------------- |
| `OG_IMAGE_SECRET`   | Signs OG image URLs                  |
| `VERCEL_TOKEN`      | Deploy gate (`HAS_VERCEL` condition) |
| `VERCEL_ORG_ID`     | Vercel org                           |
| `VERCEL_PROJECT_ID` | Vercel project                       |

See [docs/tradeoffs-and-limitations.md] for architectural notes.

[docs/tradeoffs-and-limitations.md]: ./docs/tradeoffs-and-limitations.md
