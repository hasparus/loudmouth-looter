import { relative } from "node:path";

export function postPath(postsDir: string, filePath: string): string {
  const slug = relative(postsDir, filePath)
    .replace(/\\/g, "/")
    .replace(/\.mdx?$/, "")
    .replace(/\/index$/, "")
    .replace(/^index$/, "")
    .replace(/ /g, "-");

  return "/" + slug;
}
