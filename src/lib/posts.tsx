import { talks } from "../talks/talks";
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

/** Anything listed as a card: a post, or a talk with only frontmatter. */
export interface Entry {
  frontmatter: Pick<
    PostFrontmatter,
    "title" | "description" | "date" | "path" | "tags"
  > &
    Partial<Pick<PostFrontmatter, "readingTime">>;
  Excerpt?: ExcerptComponent | undefined;
  sigil?: string | undefined;
  /** Text of the card's link; "read more" when absent. */
  linkLabel?: string;
}

/** Visible posts and talks, newest first. */
export function getEntries(): Entry[] {
  return [...getPosts(), ...talks].sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime(),
  );
}
