# Handoff: loudmouth-looter (editor × zaduma kitbash → lol.haspar.us)

**Date:** 2026-06-07
**Next focus:** Execute the implementation plan — spin the editor out of `dungeon-motion`, scaffold from newest zaduma, fuse into a new `loudmouth-looter` repo at `lol.haspar.us`.

## The single source of truth
**Plan:** `dungeon-motion/docs/plans/2026-06-06-001-feat-loudmouth-looter-editor-zaduma-plan.md`
Read it fully before doing anything. It has 10 implementation units (U1–U10), 10 KTDs, risks, output-structure tree, and open questions. This handoff does **not** duplicate it — it captures only context the plan doesn't.

## What this is
Editor (React 19 contenteditable rich-text tool, **zero RPG coupling**) lives tangled in `dungeon-motion/src/`. newest zaduma (`beerose/aleksandra.codes`, Astro 5.17, Solid islands, MDX, Vercel) is the site base. Product shape: **the editor authors MDX posts** that zaduma renders. Its custom atoms (`<Track>`, `<Line>`, GFM tasks) must round-trip editor → `.mdx` → published page.

## User decisions already made (do not re-litigate)
- **Product:** editor authors MDX posts (tightest kitbash).
- **Runtime:** React added *alongside* Solid, scoped to the editor only.
- **Package manager:** **bun** (not zaduma's pnpm — CI/Vercel get re-derived).
- **Persistence:** build on `dungeon-motion#12` (already done; see below).
- **Styling:** site-wide adopt the dungeon-motion editor skin (Avara/Crimson Text/Caveat, stone palette, SVG grain, dashed-`em`, gradient link hovers, diamond bullets).
- **Tailwind:** migrate scaffold to **v4 first** (editor CSS is v4-native), then theme. Consider upstreaming v4 migration to the zaduma repo.
- **Dark mode:** keep zaduma's **class-based toggle** → rewrite the editor's `prefers-color-scheme` rules to `.dark` variants.

## Hard prerequisite (BLOCKING)
- **`dungeon-motion#12`** ("Open and save editor documents as MDX via the File System Access API", checks green) must be **merged** before U3. It adds `editor-mdx.ts`, `editor-files.ts`, `use-linked-file.ts`, `file-system-access.d.ts` + edits to `editor-dom.tsx`/`text-editor.tsx`. The current `save-files` branch does **not** contain these yet. User said it'd merge "in an hour or so" (as of 2026-06-06) — **verify it's merged** before extraction.
- Also needed: GitHub repo `loudmouth-looter`, Vercel project + `lol.haspar.us` DNS (subdomain of `haspar.us`), `OG_IMAGE_SECRET` (or drop OG feature).

## Key repos/paths
- Editor source: `~/workspace/rpg/dungeon-motion` (worktree used this session: `.claude/worktrees/pure-waddling-taco`, branch `save-files`). Editor cluster files listed in the plan's U3.
- zaduma base: `~/workspace/zaduma` (= `beerose/aleksandra.codes`). Open PR #65 "november 2025 refresh"; rest are dependabot.
- Sibling (NOT the base): `~/workspace/homepage` (= `hasparus/homepage`, haspar.us). Lags zaduma (React 18). Confirms KTD6.
- Target (to create): `~/workspace/loudmouth-looter`.

## Open questions to resolve at execution (defaults in plan, all reversible)
1. Frontmatter: lean on zaduma's filename/git derivation vs editor emits it (prefer derivation).
2. MDX component registration: global vs per-file imports (prefer global).
3. Upstream the v4 migration to zaduma first? (recommended if timeline allows).
4. Keep `@vercel/og` (needs secret) or drop.
5. **Verify Avara font license** permits public web hosting — it's now the site's display face.
6. Does `dungeon-motion`'s editor route migrate to import from the new repo, or keep a diverging copy? (plan assumes clean copy, no back-reference — KTD5. User has not answered.)

## Suggested skills for the next session
- **ce-work** — execute the plan unit by unit (the plan is built for it).
- **agent-browser** / **playwright-tests** — real-browser verification of the editor open/save flow and render-parity (mirrors how `#12` was verified).
- **frontend-design** / **emil-design-eng** — when porting the design system (U10) and tuning the dungeon-motion skin.
- **code-review** — before merging each unit.

## Gotchas
- `editor-atoms.css` MUST stay **global** (class names persisted in saved HTML/localStorage; CSS modules break restore).
- React+Solid JSX-source collision: zaduma sets `jsxImportSource: "solid-js"` globally — scope it; let `@astrojs/react` own editor `.tsx` (U2 validates early with a throwaway island).
- MDX is strict: hand-edited files with raw `<`/`{` may fail reparse; app-written files escape correctly. Author via the editor, not by hand.
- Render parity (editor vs published page) is the acceptance bar — single CSS source of truth (`editor-atoms.css` reused render-side).
