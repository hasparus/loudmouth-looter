import { relative } from "node:path";

export function postPath(postsDir: string, filePath: string): string {
  const slug = relative(postsDir, filePath)
    .replaceAll("\\", "/")
    .replace(/\.mdx?$/, "")
    .replace(/\/index$/, "")
    .replace(/^index$/, "")
    .replaceAll(" ", "-");

  return "/" + slug;
}
