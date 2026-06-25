import type { PostFrontmatter } from "../types";

import { isPostVisible } from "./isPostVisible";

/** A teaser component — the post's opening blocks, injected by recmaMdxExcerpt. */
type ExcerptComponent = (props: { components?: unknown }) => unknown;

interface PostModule {
  frontmatter: PostFrontmatter;
  Excerpt?: ExcerptComponent | undefined;
  /** Named MDX export alternative to `frontmatter.sigil`. */
  sigil?: string;
}

const postModules = import.meta.glob<PostModule>("../../posts/**/*.mdx", {
  eager: true,
});

export interface PostEntry {
  frontmatter: PostFrontmatter;
  /** Opening blocks of the post as a component, for listing teasers. */
  Excerpt?: ExcerptComponent | undefined;
  /** Left-margin mark — from `frontmatter.sigil` or a named `sigil` export. */
  sigil?: string | undefined;
}

let cache: PostEntry[] | undefined;

/** Visible posts, newest first, each with its teaser component. */
export function getPosts(): PostEntry[] {
  if (cache) return cache;

  const entries = Object.values(postModules)
    .filter((m) =>
      isPostVisible(m.frontmatter, { isProd: import.meta.env.PROD }),
    )
    .map((m) => ({
      frontmatter: m.frontmatter,
      Excerpt: m.Excerpt,
      sigil: m.frontmatter.sigil ?? m.sigil,
    }));

  entries.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime(),
  );

  cache = entries;
  return entries;
}

/** URL-safe slug for a tag, used by /tags/[tag]. */
export function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
