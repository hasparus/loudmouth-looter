import type { PostFrontmatter } from "../types";

type RoutableFrontmatter = Pick<PostFrontmatter, "draft">;
type ListedFrontmatter = Pick<PostFrontmatter, "hidden" | "draft">;

export function isPostRoutable(
  frontmatter: RoutableFrontmatter,
  { isProd }: { isProd: boolean },
): boolean {
  return !(isProd && frontmatter.draft);
}

export function isPostListed(
  frontmatter: ListedFrontmatter,
  opts: { isProd: boolean },
): boolean {
  return isPostRoutable(frontmatter, opts) && !frontmatter.hidden;
}

export function isPostVisible(
  frontmatter: ListedFrontmatter,
  opts: { isProd: boolean },
): boolean {
  return isPostListed(frontmatter, opts);
}
