import { OG_IMAGE_SECRET } from "astro:env/server";
import { createHmac } from "node:crypto";

import type { StringifiedPost } from "../../api/og";
import type { PostFrontmatter } from "../types/PostFrontmatter";

import { normalizeImg, resolvePostImage } from "./postImages";

export async function resolvePostOgImage(
  frontmatter: PostFrontmatter,
  file: string,
): Promise<string> {
  const { og, src } = normalizeImg(frontmatter.img);
  if (og) return resolveIfRelative(file, og);
  return createOgImageLink(frontmatter, await resolveIfRelative(file, src));
}

async function resolveIfRelative<T extends string | undefined>(
  file: string,
  path: T,
): Promise<string | T> {
  if (!path?.startsWith(".")) return path;
  return (await resolvePostImage(file, path)).image.src;
}

function createOgImageLink(
  frontmatter: PostFrontmatter,
  img: string | undefined,
) {
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
