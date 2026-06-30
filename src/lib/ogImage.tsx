import type { ImageMetadata } from "astro";
import { OG_IMAGE_SECRET } from "astro:env/server";
import { createHmac } from "node:crypto";
import { dirname, join } from "node:path";

import type { StringifiedPost } from "../../api/og";
import type { PostFrontmatter } from "../types/PostFrontmatter";

const ogImages = import.meta.glob<{ default: ImageMetadata }>(
  "/posts/**/og-image.{webp,avif,gif,png,jpg,jpeg}",
);

export async function resolvePostOgImage(
  frontmatter: PostFrontmatter,
  file: string,
): Promise<string> {
  const og =
    typeof frontmatter.img === "object" ? frontmatter.img.og : undefined;
  if (!og) return createOgImageLink(frontmatter);
  if (!og.startsWith(".")) return og;

  const postsAt = file.indexOf("/posts/");
  if (postsAt === -1) {
    throw new Error(
      `resolvePostOgImage: expected a post under /posts/: ${file}`,
    );
  }

  const key = join(dirname(file.slice(postsAt)), og);
  const image = ogImages[key];
  if (!image) {
    throw new Error(
      `resolvePostOgImage: no og image at ${key} (img.og: ${og})`,
    );
  }

  return (await image()).default.src;
}

function createOgImageLink(frontmatter: PostFrontmatter) {
  let img = frontmatter.img;
  if (typeof img === "object") img = img.src;

  const timestamp = new Date(frontmatter.date).getTime();
  const minutes = frontmatter.readingTime.minutes;
  const title = frontmatter.title;
  const image = img?.replace(/^raw!/, "") || "";

  const stringifiedPost: StringifiedPost = `${timestamp}\t${minutes}\t${title}\t${image}`;

  const hmac = createHmac("sha256", OG_IMAGE_SECRET);
  hmac.update(stringifiedPost);
  const token = hmac.digest("hex");

  return `/api/og?post=${encodeURIComponent(stringifiedPost)}&token=${token}`;
}
