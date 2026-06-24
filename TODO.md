# TODO

## Restore post-fixture coverage with future blog posts

Only `why-dragon` is public; e2e targets it. Visual regression is opt-in via
`RUN_VISUAL_REGRESSION=1` until fresh snapshots exist. Add coverage back as
future posts exercise these cases:

- [ ] Shiki / Twoslash code blocks with syntax-colored spans.
- [ ] Frontmatter-driven date/image rendering beyond the default live post.
- [ ] Markdown kitchen-sink rendering: tables, task lists, blockquotes, code
      fences, footnotes, sub/sup, images, and links.
- [ ] Editor atoms beyond why-dragon: chevron lines, circle/rhomb tracks,
      task-list checked state, interactive `defaultValue` tracks.
- [ ] Per-platform visual snapshots for new canonical posts, especially Linux CI
      snapshots for `/why-dragon/`.
- [ ] Per-platform index snapshots after the post list and homepage height
      settle.
- [ ] Agent endpoints and Lighthouse URLs covering more than one post once more
      public posts exist.
