import { execFileSync } from "node:child_process";
import type { Plugin } from "unified";

import type { PostFrontmatter, PostProps } from "../types";

function gitCreationDate(path: string): string | null {
  try {
    const log = execFileSync(
      "git",
      [
        "log",
        "--follow",
        "--diff-filter=A",
        "--find-renames=40%",
        "--format=%ai",
        "--",
        path,
      ],
      { encoding: "utf8" },
    );
    return log.trim().split("\n")[0] || null;
  } catch {
    return null;
  }
}

export const derivedTitleAndDatePlugin: Plugin<
  [{ title: (fileStem: string) => string }]
> = ({ title }) => {
  return (_tree, file) => {
    const data = file.data as { astro: PostProps };
    const frontmatter = data.astro.frontmatter as Partial<PostFrontmatter>;

    frontmatter.title ||= title(file.stem || "");

    frontmatter.date ||= gitCreationDate(file.path) ?? new Date().toISOString();
  };
};
