# TODO: post-relative header images — `img.src: "./stonetop.png"`

## Goal

Frontmatter header images colocated with the post, like og-images already are:

```yaml
# posts/stonetop-west-marches-march-2025/index.mdx
img:
  src: "./stonetop.png"
```

Rendered through `src/lib/prose/Image.astro` with the full treatment:
optimized webp via `getImage`, plaiceholder CSS placeholder, capped to
`WIDE_CONTAINER_WIDTH`.

## Current state (working, committed-ready)

- `posts/stonetop-west-marches-march-2025/index.mdx` uses an inline body image
  (`![Kamienny Wierch](./stonetop.png)`) instead of `img.src` frontmatter.
  Build is green.
- Caveat: inline relative MDX images resolve to `/_astro/...` URLs, which hit
  Image.astro's `astro-asset` branch — served **as-is, no webp, no placeholder,
  no width cap**. The stonetop page currently ships the raw 2.2 MB PNG at
  1536×1024. This TODO fixes that too.
- An abandoned attempt lives in `git stash` ("claude: abandoned Image.astro
  relative-img.src attempt, see TODO.md") — read it for reference, don't just
  pop it; it breaks the build (see Gotchas #3).

## Diagnosis — why the obvious approaches fail

1. **`img.src: "/foo/bar.png"` (src/images convention) is broken in prod
   builds.** `resolveImageSource` in `src/lib/prose/Image.astro` looks up
   `import.meta.glob("../../../src/images/**/*")` with key
   `"../../../src/images" + source`, but Rollup rewrites the compiled glob
   keys relative to the output chunk — in `dist/.prerender/chunks/*` they
   become `"../../images/..."` (no `src/` segment). Lookup misses → "Image not
   found in src/images". The homepage's copy of this file has the fix:
   `allImages[pathToImage.replace("../src/", "")]` (homepage
   `src/lib/prose/Image.astro:119`). No image in this repo ever used the
   src/images path, so the bug went unnoticed.

2. **Resolving `./x.png` → `ImageMetadata.src` string in PostLayout loses
   optimization.** Passing the metadata's `.src` (`/_astro/foo.hash.png`) to
   `<Image>` lands in the `astro-asset` kind, which skips `getImage` and
   plaiceholder entirely (2.2 MB PNG shipped verbatim).

3. **Synthesizing `kind: "src-image"` from arbitrary metadata breaks the
   placeholder.** `readImageForPlaceholder` assumes src-image sources live at
   `join(cwd, "src", "images", source.src)` — for a post-dir image whose
   metadata src is `/_astro/foo.hash.png` it tries to read
   `src/images/_astro/foo.hash.png` → ENOENT at build. This is what broke the
   build in the stashed attempt.

## Suggested approach

Extend `resolveImageSource` (or add a resolution step before it) with a
**post-relative kind**, mirroring `resolvePostOgImage` in `src/lib/ogImage.tsx`:

- Glob: `import.meta.glob("/posts/**/*.{png,jpg,jpeg,webp,avif,gif}")` —
  root-absolute glob keys are NOT rewritten by Rollup (see `ogImages` in
  `ogImage.tsx`, which works in prod).
- Key: `join(dirname(file.slice(file.indexOf("/posts/"))), src)` — needs the
  post's `file` path, so either resolve in `PostLayout.astro` (it has
  `Astro.props.file`) and pass something Image.astro handles, or add a
  `relativeTo?: string` prop to Image.astro.
- For the placeholder, don't derive an fs path from the emitted URL. Options:
  read from `posts/<dir>/<name>` directly (you know the source path at resolve
  time — carry it on the ImageSource), or use the metadata's `fsPath`
  (Astro attaches it to ImageMetadata; verify before relying on it).
- Optimization: return the loaded `ImageMetadata` in a kind that goes through
  the existing `getImage({ src: image, format: "webp", ... })` branch, like
  `src-image` does.
- While in there, port the homepage's glob-key fix (Diagnosis #1) so the
  `/src/images` convention works too — one line.

Then flip `stonetop-west-marches-march-2025/index.mdx` back to `img.src:
"./stonetop.png"` frontmatter and drop the inline image.

## Acceptance

- `bun run build` green.
- `dist/stonetop-west-marches-march-2025/index.html` header `<img>` points at
  a **webp** `/_astro/...` asset, width ≤ 774, with plaiceholder CSS on the
  wrapper span (compare with a src-image post on the homepage).
- Dev server (`bun run dev`) renders the same post correctly (dev metadata
  srcs are `/@fs/...` or query-string forms — test both modes).
- why-dragon post unchanged (its `img.og` and body images still work).
- e2e: `bun run test:e2e` if configured, else manual check of `/why-dragon`
  and `/stonetop-west-marches-march-2025`.
