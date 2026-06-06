# Overnight report — loudmouth-looter

**Date:** 2026-06-07 (overnight session)
**TL;DR:** The kitbash works end-to-end locally. The dungeon-motion editor runs at
`/editor` as a React island on the zaduma Astro+Solid+MDX base; it authors `.mdx`
posts whose custom atoms (`<Track>`, `<Line>`, GFM tasks) render on published pages
through the **same** stylesheet. Builds green, 8 new accessible e2e tests pass.
**You're needed for deployment + 2 licensing/decision blockers.** Nothing is pushed
to any remote.

---

## What works (verified)

- `bun install` → `bun run build` builds **12 pages** clean (incl. `/editor` and the
  sample post `/features/editor-atoms`).
- `bun run typecheck` clean (site at `strictest`, editor at `strict` — dual tsconfig).
- `bun run lint --quiet` clean (CI uses `--quiet`).
- **Editor live** (`/editor`): hydrates, contenteditable works, slash menu opens as an
  ARIA listbox, `/squares 4` inserts a track, `- [ ] ` shorthand creates a task toggle,
  clicking a toggle flips `aria-checked`, dark mode follows the OS. Screenshot looked right
  (grain skin, serif headings via Georgia fallback, Crimson Text body).
- **Render parity proven**: the sample post renders 3 track shapes with correct fills
  (squares 2/4, circles 3/5, rhombs 1/3), arrow + chevron marker lines, and GFM task
  checkboxes with preserved state — all via the shared `editor-atoms.css`. Track/Line DOM
  is byte-identical to the editor's own output (confirmed by a review subagent).
- **8 new e2e tests** (`e2e/editor.spec.ts`, `e2e/render-parity.spec.ts`) pass; existing
  zaduma specs still pass (updated 1 hardcoded post count 7→8).

Commits (local `main`, not pushed):
```
cd0268f Address review: bun-ify CI/deploy, fix editor dark color-scheme, type-aware lint…
9201a5e Add accessible e2e tests for editor + render parity; switch playwright webServer…
67413a8 Render Track/Line atoms in published MDX via shared editor-atoms.css; add sample post
e45d387 Copy editor cluster into src/editor, wire /editor route (React island, scoped skin)
44989f0 Add React 19 alongside Solid, scope JSX runtimes via globs (validated)
f16da1d Scaffold loudmouth-looter from zaduma base, convert to bun
```

How to run: `bun install && bun run dev` → http://localhost:4321/editor and
/features/editor-atoms. Tests: `bun run build && bunx playwright test --project=desktop`
(skip `visual-regression.spec.ts`, see below). Needs `.env.local` with `OG_IMAGE_SECRET`
(a dummy is already there for local dev).

---

## BLOCKERS — need you

1. **GitHub repo + push.** I made a local git repo with the commits above but created **no
   remote** and pushed nothing (didn't want to create a public repo or push without you).
   Create `loudmouth-looter` on GitHub and `git push`.

2. **Vercel project + DNS + secrets.** Create the Vercel project, point `lol.haspar.us`
   (subdomain of `haspar.us`) at it, and set repo secrets: `VERCEL_TOKEN`,
   `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `OG_IMAGE_SECRET`. Then replace the leftover
   zaduma hostname in **4 places**: `astro.config.ts:18`, `.github/workflows/ci.yml`
   (`PRODUCTION_HOSTNAME`), and `.github/scripts/deploy.mjs` (alias, ~lines 101 & 132).

3. **`OG_IMAGE_SECRET`.** I **deleted** zaduma's real secret that got copied in `.env`
   (it was about to be committed — `.env` was not gitignored). Put your own in Vercel +
   `.env.local`, or drop the `@vercel/og` feature. `.env.example` documents it; gitignore
   now blocks all `.env*` except the example.

4. **Avara font license.** This is the site's display face but its license for **public**
   web hosting is unverified (open question #5 from the handoff). I did **not** copy the
   `Avara-*.woff2` files from dungeon-motion into this public repo. Headings fall back to
   Georgia. If the license is fine: drop the 3 woff2 into `public/fonts/`, add their
   `@font-face` to `editor-skin.css` (or a `fonts.css`), and add preloads to `editor.astro`.

5. **Decision: dungeon-motion's editor route.** Handoff open question #6 — does
   dungeon-motion's editor migrate to import from this repo, or keep a diverging copy?
   I copied verbatim (clean copy, no back-reference), as the plan assumed. Your call to
   confirm.

---

## Deferred (deliberately, reversible) — for your morning

- **Tailwind v4 + site-wide skin (handoff's U-of-record decision).** I kept the site on
  **Tailwind v3** and scoped the editor's skin to the `/editor` page via a v3-compatible
  `editor-skin.css`. Why deferred: the full v4 migration needs `@reference` added to ~13
  `@apply` CSS files (a risky sitewide sweep best done with your eyes), AND the skin it
  enables is blocked on Avara anyway + warrants design review (you listed
  frontend-design/emil-design-eng for it). **Consequence:** custom atoms hit render parity
  now, but **prose** (fonts/colors) on published pages still uses zaduma's skin, not the
  editor's. Closing that = the v4 + skin work. Task #3 in the tracker has the detail.

- **GFM task-list visual parity.** Editor shows tasks as `te-toggle` squares; published
  pages render native GFM `<input type=checkbox>`. Functionally correct + accessible, but
  visually different. A review subagent produced the exact CSS to unify them (style
  `.contains-task-list > li.task-list-item > input[type=checkbox]` like
  `.te-toggle[data-shape=square]`, reusing the clip-path) — do it during the skin pass and
  reconcile with `Ul.module.css`'s `translateY(1px)` nudge.

- **`visual-regression.spec.ts`.** Its PNG baselines were generated in zaduma's
  environment; regenerate with `bunx playwright test visual-regression --update-snapshots`
  for this repo before trusting it.

- **Wire `astro check` into CI.** `.astro` frontmatter isn't typechecked by `tsc`.
  `astro check` confirms my new components are clean, but surfaces **5 pre-existing zaduma
  errors** (asidesPlugin hast types, PostLayout Image/og schema, image-editor.gitignored
  missing `description`). Fix those, then add `astro check` to the `typecheck` script.

- **Branding.** Homepage still renders "zaduma"; rename site title/meta when ready.

---

## Notes / smaller things

- **The implementation plan referenced by HANDOFF.md does not exist.** No
  `docs/plans/2026-06-06-001-…-plan.md` in any dungeon-motion branch/worktree (only
  flavor-text `PLAN.md` in editor content). I reconstructed the 10-unit plan from the
  handoff + the actual code. If you have it elsewhere, cross-check my choices against it.
- **`#12` is NOT merged into dungeon-motion `main`** — but its MDX code exists on the
  `why-dragon`/`save-files` branches, which is where I extracted the editor from. loudmouth
  doesn't depend on the merge; still worth merging upstream for that repo's hygiene.
- **`/thermo-nuclear-code-quality-review` and `/ce-work` are not registered** in this
  environment (only appear in old transcripts). I substituted parallel review subagents +
  the available tooling. Re-run your real command in the morning if you want.
- **Pre-existing CI bug:** `.github/workflows/ci.yml` uses `case(...)` in the
  `OG_IMAGE_SECRET` build env — not valid GitHub Actions expression syntax (fails for fork
  PRs). Inherited from zaduma; fix when wiring secrets.
- I bun-ified the CI workflow + `deploy.mjs` (pnpm→bun/bunx) since the handoff said CI gets
  re-derived. The deploy *policy* (Vercel steps, lighthouse) is untouched and still needs
  your secrets/domain to actually run.

## Key decisions I made (reversible)
- React isolated under `src/editor/`; astro.config routes JSX via
  `react({include:["**/editor/**"]})` + `solidJs({exclude:["**/editor/**"]})`. Validated a
  React island hydrates alongside Solid's command palette on one page.
- Editor copied **verbatim**; only change was rewriting its `prefers-color-scheme` dark
  rules to `.dark` (your class-based toggle) and adding `@jsxImportSource react` pragmas.
- Editor gets its own `src/editor/tsconfig.json` (`strict` + react-jsx + DOM.Iterable, the
  config it was authored against) so the site stays at `strictest` without editing the
  copied code. ESLint points at both tsconfig projects.

## Unresolved questions for you
1. Confirm the v4 + site-wide skin is still the target (vs keeping the editor-scoped skin)?
2. Avara license — cleared for public hosting, or pick a different display face?
3. dungeon-motion editor route: migrate to import from here, or keep the diverging copy?
4. Should the "Editor Atoms" demo post ship on the live homepage, or be removed/hidden
   before launch?
