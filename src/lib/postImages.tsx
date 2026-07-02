import type { ImageMetadata } from "astro";
import { dirname, join } from "node:path";

const postImages = import.meta.glob<{ default: ImageMetadata }>(
  "/posts/**/*.{png,jpg,jpeg,webp,avif,gif}",
);

/** Resolves a post-relative image path (`./stonetop.png`) to its metadata. */
export async function resolvePostImage(
  file: string,
  src: string,
): Promise<ImageMetadata> {
  const postsAt = file.indexOf("/posts/");
  if (postsAt === -1) {
    throw new Error(`resolvePostImage: expected a post under /posts/: ${file}`);
  }

  const key = join(dirname(file.slice(postsAt)), src);
  const image = postImages[key];
  if (!image) {
    throw new Error(`resolvePostImage: no image at ${key} (src: ${src})`);
  }

  return (await image()).default;
}
