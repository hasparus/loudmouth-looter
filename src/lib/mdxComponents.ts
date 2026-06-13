import Line from "../editor/render/Line.astro";
import Move from "../editor/render/Move.astro";
import Track from "../editor/render/Track.astro";

import { Blockquote } from "./prose/Blockquote";
import { Code, Pre } from "./prose/code-and-pre";
import { createHeading } from "./prose/Heading";
import Hr from "./prose/Hr.astro";
import Image from "./prose/Image.astro";
import { Ol } from "./prose/Ol";
import { Paragraph } from "./prose/Paragraph";
import { Table } from "./prose/Table";
import { Ul } from "./prose/Ul";
import { Link } from "./Link";

/**
 * Component map for rendering post MDX — the full post (`[...path].astro`) and
 * the listing teasers (`PostCard` → `post.Excerpt`) share it so an excerpt
 * looks exactly like the opening of the post it teases.
 *
 * Note: these replace Markdown and uppercased components, not inline lowercased
 * JSX, so a literal `<p>` in an .mdx file won't use `Paragraph`.
 */
export const mdxComponents = {
  a: Link,
  h1: createHeading("h1"),
  h2: createHeading("h2"),
  h3: createHeading("h3"),
  h4: createHeading("h4"),
  h5: createHeading("h5"),
  h6: createHeading("h6"),
  img: Image,
  hr: Hr,
  table: Table,
  ul: Ul,
  ol: Ol,
  blockquote: Blockquote,
  code: Code,
  Code,
  pre: Pre,
  Pre,
  p: Paragraph,
  // Editor atoms authored in the /editor tool and saved into .mdx posts.
  Track,
  Line,
  Move,
};
