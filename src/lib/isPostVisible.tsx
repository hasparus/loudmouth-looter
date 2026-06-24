import type { PostFrontmatter } from "../types";

type RoutableFrontmatter = Pick<PostFrontmatter, "hidden" | "draft">;
type ListedFrontmatter = Pick<PostFrontmatter, "hidden" | "draft" | "fixture">;

export function isPostRoutable(
  frontmatter: RoutableFrontmatter,
  { isProd }: { isProd: boolean },
): boolean {
  return !frontmatter.hidden && !(isProd && frontmatter.draft);
}

export function isPostListed(
  frontmatter: ListedFrontmatter,
  opts: { isProd: boolean },
): boolean {
  return isPostRoutable(frontmatter, opts) && frontmatter.fixture !== true;
}

export function isPostVisible(
  frontmatter: ListedFrontmatter,
  opts: { isProd: boolean },
): boolean {
  return isPostListed(frontmatter, opts);
}
