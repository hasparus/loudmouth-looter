import type { PostFrontmatter } from "../types";

import { getPostExcerpt } from "./getPostExcerpt";
import { isPostVisible } from "./isPostVisible";

const postModules = import.meta.glob<{ frontmatter: PostFrontmatter }>(
  "../../posts/**/*.mdx",
  { eager: true },
);
const rawModules = import.meta.glob<string>("../../posts/**/*.mdx", {
  query: "?raw",
  import: "default",
  eager: true,
});

export interface PostEntry {
  frontmatter: PostFrontmatter;
  /** First blocks of the post rendered to HTML, for listing teasers. */
  excerpt: string;
}

let cache: PostEntry[] | undefined;

/** Visible posts, newest first, each with a rendered excerpt. */
export async function getPosts(): Promise<PostEntry[]> {
  if (cache) return cache;

  const entries = await Promise.all(
    Object.entries(postModules)
      .filter(([, m]) =>
        isPostVisible(m.frontmatter, { isProd: import.meta.env.PROD }),
      )
      .map(async ([key, { frontmatter }]) => ({
        frontmatter,
        excerpt: await getPostExcerpt(rawModules[key] ?? "", { blocks: 2 }),
      })),
  );

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
