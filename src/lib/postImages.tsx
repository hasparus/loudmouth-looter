import type { ImageMetadata } from "astro";
import { dirname, join } from "node:path";

import type { PostFrontmatter } from "../types/PostFrontmatter";

const postImages = import.meta.glob<{ default: ImageMetadata }>(
  "/posts/**/*.{png,jpg,jpeg,webp,avif,gif}",
);

/**
 * Looks up a root-absolute key in an `import.meta.glob` record and loads the
 * image, deriving its filesystem path from the key.
 */
export async function loadGlobImage(
  images: Record<string, () => Promise<{ default: ImageMetadata }>>,
  key: string,
  globName: string,
): Promise<{ image: ImageMetadata; fsPath: string }> {
  const load = images[key];
  if (!load) {
    throw new Error(`Image not found in ${globName}: ${key}`);
  }

  const { default: image } = await load();
  return { image, fsPath: join(process.cwd(), key) };
}

/** Resolves a post-relative image path (`./stonetop.png`). */
export async function resolvePostImage(
  file: string,
  src: string,
): Promise<{ image: ImageMetadata; fsPath: string }> {
  const postsAt = file.indexOf("/posts/");
  if (postsAt === -1) {
    throw new Error(`resolvePostImage: expected a post under /posts/: ${file}`);
  }

  return loadGlobImage(
    postImages,
    join(dirname(file.slice(postsAt)), src),
    "posts",
  );
}

export function normalizeImg(img: PostFrontmatter["img"]): {
  og?: string;
  src?: string;
} {
  if (typeof img === "object") return img;
  return img === undefined ? {} : { src: img };
}
