import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import matter from "gray-matter";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

interface MdastNode {
  type: string;
  value?: string;
  children?: MdastNode[];
}

const parser = unified().use(remarkParse).use(remarkMdx);
const stringifier = unified()
  .use(remarkStringify)
  .use(remarkGfm)
  .use(remarkMdx);

const CONTENT_BLOCKS = new Set(["paragraph", "blockquote", "list", "table"]);

const LEDE_ENDERS = new Set(["heading", "thematicBreak", "code"]);

let processorPromise: ReturnType<typeof createMarkdownProcessor> | undefined;

function hasImage(node: MdastNode): boolean {
  if (node.type === "image") return true;
  return (node.children ?? []).some(hasImage);
}

function textContent(node: MdastNode): string {
  if (node.type === "text" || node.type === "inlineCode") return node.value ?? "";
  return (node.children ?? []).map(textContent).join("");
}

/**
 * Render the opening blocks of an MDX post to HTML for the index/tag listings.
 * Unlike a plain-text snippet this keeps real markdown — a leading blockquote,
 * image or list renders as itself. The lede stops at the first heading, code
 * fence or thematic break; link definitions are carried along so references
 * resolve.
 */
export async function getPostExcerpt(
  raw: string,
  { blocks = 2 }: { blocks?: number } = {},
): Promise<string> {
  if (!raw) return "";

  try {
    const { content } = matter(raw);
    const tree = parser.parse(content) as unknown as MdastNode;
    const children = tree.children ?? [];

    const picked: MdastNode[] = [];
    for (const node of children) {
      if (picked.length >= blocks) break;

      if (LEDE_ENDERS.has(node.type)) {
        if (picked.length) break;
        continue;
      }

      if (node.type === "paragraph") {
        if (!hasImage(node) && !textContent(node).trim()) continue;
        picked.push(node);
        continue;
      }

      if (CONTENT_BLOCKS.has(node.type)) picked.push(node);
    }

    if (!picked.length) return "";

    const definitions = children.filter((n) => n.type === "definition");
    const md = stringifier.stringify({
      type: "root",
      children: [...picked, ...definitions],
    } as never);

    processorPromise ??= createMarkdownProcessor({ gfm: true, smartypants: true });
    const { code } = await (await processorPromise).render(md);
    return code;
  } catch {
    return "";
  }
}
