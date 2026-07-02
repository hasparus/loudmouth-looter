import { OG_IMAGE_SECRET } from "astro:env/server";
import { createHmac } from "node:crypto";

import type { StringifiedPost } from "../../api/og";
import type { PostFrontmatter } from "../types/PostFrontmatter";

import { resolvePostImage } from "./postImages";

export async function resolvePostOgImage(
  frontmatter: PostFrontmatter,
  file: string,
): Promise<string> {
  const og =
    typeof frontmatter.img === "object" ? frontmatter.img.og : undefined;
  if (og) {
    return og.startsWith(".") ? (await resolvePostImage(file, og)).src : og;
  }

  let img =
    typeof frontmatter.img === "object" ? frontmatter.img.src : frontmatter.img;
  if (img?.startsWith(".")) {
    img = (await resolvePostImage(file, img)).src;
  }

  return createOgImageLink(frontmatter, img);
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
