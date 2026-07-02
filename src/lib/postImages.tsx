import type { ImageMetadata } from "astro";
import { dirname, join } from "node:path";

import type { PostFrontmatter } from "../types/PostFrontmatter";

const postImages = import.meta.glob<{ default: ImageMetadata }>(
  "/posts/**/*.{png,jpg,jpeg,webp,avif,gif}",
);

/** Resolves a post-relative image path (`./stonetop.png`). */
export async function resolvePostImage(
  file: string,
  src: string,
): Promise<{ image: ImageMetadata; fsPath: string }> {
  const postsAt = file.indexOf("/posts/");
  if (postsAt === -1) {
    throw new Error(`resolvePostImage: expected a post under /posts/: ${file}`);
  }

  const key = join(dirname(file.slice(postsAt)), src);
  const image = postImages[key];
  if (!image) {
    throw new Error(`resolvePostImage: no image at ${key} (src: ${src})`);
  }

  return { image: (await image()).default, fsPath: join(process.cwd(), key) };
}

export function normalizeImg(img: PostFrontmatter["img"]): {
  og?: string;
  src?: string;
} {
  if (typeof img === "object") return img;
  return img === undefined ? {} : { src: img };
}
