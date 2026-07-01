import type {
  CallExpression,
  Expression,
  FunctionDeclaration,
  Program,
  Property,
  SpreadElement,
  Statement,
  VariableDeclaration,
} from "estree";
import type { Plugin } from "unified";
import type { VFile } from "vfile";

import type { PostFrontmatter } from "../types";

/** Number of leading blocks shown when a post doesn't set `excerpt.blocks`. */
const DEFAULT_EXCERPT_BLOCKS = 2;

/** Blocks that end the lede: a heading or a code fence. */
const LEDE_ENDERS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "pre"]);

/** Blocks dropped from the excerpt without ending the lede. */
const LEDE_SKIPS = new Set(["hr"]);

type ChildNode = Expression | SpreadElement | null;

/**
 * Adds `export function Excerpt(props)` to every compiled MDX module — the
 * post's first blocks, ready to render on the index and tag listings. A post
 * can set `excerpt: { blocks }` in frontmatter to widen or narrow the teaser;
 * it defaults to {@link DEFAULT_EXCERPT_BLOCKS}. Every block type is kept —
 * paragraphs, lists, blockquotes, images, and editor atoms (Track/Line/Move)
 * alike; nothing is filtered out.
 *
 * It runs at the recma (estree) stage, after MDX has rewritten `<p>` to
 * `<_components.p>` and lowered JSX to `_jsx(...)` calls, so the excerpt reuses
 * the exact same component map as the full post (`Link`, `Paragraph`,
 * `Blockquote`, `Code`, …) — no second markdown processor, no `set:html`, no
 * bare-HTML style shim. Reference-style links are already resolved by this
 * point, so they carry over for free.
 *
 * Implementation: `_createMdxContent` returns `_jsxs(_Fragment, {children: […]})`
 * (the children interleave block calls with `"\n"` separators). We clone that
 * call and swap in only the lede blocks — reusing whatever jsx runtime fn the
 * module already imported (`_jsxs` in build, `_jsxDEV` in dev), so it works in
 * both modes. The lede is the opening blocks up to (but not including) the first
 * heading or code fence; thematic breaks (`hr`) are dropped but don't end it.
 */
export const recmaMdxExcerpt: Plugin<[], Program> = () => {
  return (tree: Program, file: VFile) => {
    const blocks = excerptBlocks(file);

    const createMdxContent = tree.body.find(
      (node): node is FunctionDeclaration =>
        node.type === "FunctionDeclaration" &&
        node.id.name === "_createMdxContent",
    );
    if (!createMdxContent) return;

    const body = createMdxContent.body.body;

    const returnStatement = body.find(
      (node) => node.type === "ReturnStatement",
    );
    const root = returnStatement?.argument;
    if (!root || root.type !== "CallExpression") return;

    const excerptReturn = buildExcerptReturn(root, blocks);
    if (!excerptReturn) return;

    // Reuse `const _components = { …, ...props.components }` verbatim so the
    // excerpt resolves components identically to the full post.
    const componentsDecl = body.find(
      (node): node is VariableDeclaration =>
        node.type === "VariableDeclaration" &&
        node.declarations.some(
          (d) => d.id.type === "Identifier" && d.id.name === "_components",
        ),
    );

    const fnBody: Statement[] = [];
    if (componentsDecl) fnBody.push(clone(componentsDecl));
    fnBody.push({ type: "ReturnStatement", argument: excerptReturn });

    tree.body.push({
      type: "ExportNamedDeclaration",
      source: null,
      specifiers: [],
      attributes: [],
      declaration: {
        type: "FunctionDeclaration",
        id: { type: "Identifier", name: "Excerpt" },
        params: [{ type: "Identifier", name: "props" }],
        generator: false,
        async: false,
        body: { type: "BlockStatement", body: fnBody },
      },
    });
  };
};

/** Per-post teaser size from `excerpt.blocks` frontmatter, or the default. */
function excerptBlocks(file: VFile): number {
  const data = file.data as { astro?: { frontmatter?: PostFrontmatter } };
  const blocks = data.astro?.frontmatter?.excerpt?.blocks;
  return typeof blocks === "number" && Number.isInteger(blocks) && blocks > 0
    ? blocks
    : DEFAULT_EXCERPT_BLOCKS;
}

/**
 * From `_createMdxContent`'s return (`_jsxs(_Fragment, {children})` or a single
 * block call), produce the lede as a cloned call expression — or null if the
 * post opens with no content before a heading.
 */
function buildExcerptReturn(
  root: CallExpression,
  blocks: number,
): CallExpression | null {
  const typeArg = root.arguments[0];
  const isFragment =
    typeArg?.type === "Identifier" && typeArg.name === "_Fragment";

  if (!isFragment) {
    // Single top-level block: keep it unless it's a lede-ender.
    const name = blockName(root);
    if (!name || LEDE_ENDERS.has(name) || LEDE_SKIPS.has(name)) return null;
    return clone(root);
  }

  const childrenProp = findChildren(root.arguments[1]);
  if (childrenProp?.type !== "ArrayExpression") return null;

  const picked = pickLede(childrenProp.elements, blocks);
  if (picked.length === 0) return null;

  const cloned = clone(root);
  const clonedChildren = findChildren(cloned.arguments[1]);
  if (clonedChildren?.type === "ArrayExpression") {
    clonedChildren.elements = picked.map(clone);
  }
  return cloned;
}

function pickLede(children: ChildNode[], blocks: number): CallExpression[] {
  const picked: CallExpression[] = [];
  for (const child of children) {
    if (picked.length >= blocks) break;
    if (!child || child.type !== "CallExpression") continue; // skip "\n"

    const name = blockName(child);
    if (!name) continue;

    if (LEDE_SKIPS.has(name)) continue;

    if (LEDE_ENDERS.has(name)) {
      if (picked.length > 0) break;
      continue;
    }

    // Every other block is shown — paragraphs, lists, blockquotes, images,
    // and editor atoms alike. Nothing is filtered out.
    picked.push(child);
  }
  return picked;
}

/** The component name of a `_jsx(_components.p, …)` / `_jsx(Track, …)` call. */
function blockName(call: CallExpression): string | null {
  const typeArg = call.arguments[0];
  if (!typeArg) return null;
  if (
    typeArg.type === "MemberExpression" &&
    typeArg.object.type === "Identifier" &&
    typeArg.object.name === "_components" &&
    typeArg.property.type === "Identifier"
  ) {
    return typeArg.property.name;
  }
  if (typeArg.type === "Identifier") return typeArg.name;
  return null;
}

/** The value of the `children` prop in a jsx call's props object. */
function findChildren(
  obj: Expression | SpreadElement | undefined,
): Expression | null {
  if (obj?.type !== "ObjectExpression") return null;
  for (const prop of obj.properties) {
    if (
      prop.type === "Property" &&
      !prop.computed &&
      keyName(prop) === "children" &&
      prop.value.type !== "ObjectPattern" &&
      prop.value.type !== "ArrayPattern" &&
      prop.value.type !== "AssignmentPattern" &&
      prop.value.type !== "RestElement"
    ) {
      return prop.value;
    }
  }
  return null;
}

function keyName(prop: Property): string | null {
  if (prop.key.type === "Identifier") return prop.key.name;
  if (prop.key.type === "Literal" && typeof prop.key.value === "string") {
    return prop.key.value;
  }
  return null;
}

function clone<T>(node: T): T {
  return structuredClone(node);
}
