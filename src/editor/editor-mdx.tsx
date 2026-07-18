import type {
  BlockContent,
  Heading,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
} from "mdast";
import type {
  MdxJsxAttribute,
  MdxJsxFlowElement,
  MdxJsxTextElement,
} from "mdast-util-mdx-jsx";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

import {
  buildJsxElement,
  buildToggleElement,
  buildTrackElement,
} from "./editor-atoms";
import { buildMoveElement } from "./move-dom";
import { resolveMoveFromMdx } from "./move-props";
import { resolveTrackProps, type Shape, TRACK_SHAPES } from "./track-props";

const processor = unified()
  .use(remarkParse)
  .use(remarkStringify, { bullet: "-", emphasis: "_", listItemIndent: "one" })
  .use(remarkGfm)
  .use(remarkMdx);

export function htmlToMdx(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  const tree: Root = { type: "root", children: blocksFrom(template.content) };
  return processor.stringify(tree);
}

// Preserved MDX (JSX atoms, imports, frontmatter) re-enters the tree as
// `html` nodes: remark-stringify emits their value verbatim, so the source
// stored on the atom survives the round-trip byte-for-byte.
function rawMdxBlock(el: HTMLElement): RootContent | null {
  const stored = el.dataset.mdx;
  return stored?.trim() ? { type: "html", value: stored } : null;
}

function blocksFrom(parent: ParentNode): RootContent[] {
  const out: RootContent[] = [];
  for (const node of parent.childNodes) {
    const block = blockFrom(node);
    if (block) out.push(block);
  }
  return out;
}

function blockFrom(node: ChildNode): RootContent | null {
  if (node instanceof Text) {
    const value = normalizeText(node.data);
    return value.trim() ? { type: "paragraph", children: [text(value)] } : null;
  }
  if (!(node instanceof HTMLElement)) return null;

  if (node.classList.contains("te-jsx")) return rawMdxBlock(node);

  switch (node.tagName) {
    case "H1":
      return heading(1, node);
    case "H2":
      return heading(2, node);
    case "OL":
      return listFrom(node, true);
    case "ARTICLE":
      return node.classList.contains("te-move") ? moveElement(node) : null;
    case "DIV":
      return node.classList.contains("te-move") ? moveElement(node) : null;
    case "P":
      if (node.classList.contains("te-arrow"))
        return lineElement("arrow", node);
      if (node.classList.contains("te-chevron"))
        return lineElement("chevron", node);
      return paragraph(node);
    case "UL":
      return listFrom(node, false);
    default:
      return null;
  }
}

function moveElement(el: HTMLElement): MdxJsxFlowElement {
  const bodyRoot = el.querySelector("[data-move-body]");
  if (bodyRoot instanceof HTMLElement) {
    const titleEl = el.querySelector("h3");
    const title = titleEl ? normalizeText(titleEl.textContent) : "";
    const children: BlockContent[] = [];
    if (title) {
      children.push({
        type: "heading",
        depth: 2,
        children: [text(title)],
      });
    }
    children.push(...(blocksFrom(bodyRoot) as BlockContent[]));
    return {
      type: "mdxJsxFlowElement",
      attributes: storedMoveAttributes(el),
      children,
      name: "Move",
    };
  }

  return {
    type: "mdxJsxFlowElement",
    attributes: storedMoveAttributes(el),
    children: blocksFrom(el) as BlockContent[],
    name: "Move",
  };
}

// Restore the Move's original attributes (illuminated, isBaseMove, resources,
// …) that mdxToHtml stashed on the card, so open→save doesn't strip them.
function storedMoveAttributes(
  el: HTMLElement,
): MdxJsxFlowElement["attributes"] {
  const stored = el.dataset.moveAttrs;
  if (!stored) return [];
  try {
    const first = processor.parse(stored).children[0];
    if (first?.type === "mdxJsxFlowElement") return first.attributes;
  } catch {
    // Corrupted attribute payloads are dropped rather than corrupting the doc.
  }
  return [];
}

function heading(depth: 1 | 2, el: HTMLElement): Heading {
  return { type: "heading", children: phrasingFrom(el), depth };
}

function paragraph(el: HTMLElement): Paragraph {
  return { type: "paragraph", children: phrasingFrom(el) };
}

function listFrom(el: HTMLElement, ordered: boolean): List {
  const children: ListItem[] = [];
  for (const li of el.children) {
    if (li instanceof HTMLElement && li.tagName === "LI")
      children.push(listItemFrom(li));
  }
  return { type: "list", children, ordered, spread: false };
}

function listItemFrom(li: HTMLElement): ListItem {
  const isTask = li.classList.contains("te-task");
  return {
    type: "listItem",
    checked: isTask ? toggleChecked(li) : null,
    children: [{ type: "paragraph", children: phrasingFrom(li) }],
    spread: false,
  };
}

function lineElement(
  kind: "arrow" | "chevron",
  el: HTMLElement,
): MdxJsxFlowElement {
  const children: BlockContent[] = [
    { type: "paragraph", children: phrasingFrom(el) },
  ];
  return {
    type: "mdxJsxFlowElement",
    attributes: [attribute("kind", kind)],
    children,
    name: "Line",
  };
}

function phrasingFrom(parent: HTMLElement): PhrasingContent[] {
  const out: PhrasingContent[] = [];
  const children = [...parent.childNodes];
  for (const node of children) {
    if (node instanceof Text) {
      const value = normalizeText(node.data);
      if (value) out.push(text(value));
      continue;
    }
    if (!(node instanceof HTMLElement)) continue;

    if (node.tagName === "BR") {
      if (children.length > 1) out.push({ type: "break" });
      continue;
    }
    if (node.classList.contains("te-jsx-inline")) {
      const stored = node.dataset.mdx;
      if (stored?.trim()) out.push({ type: "html", value: stored });
      continue;
    }
    if (node.classList.contains("te-toggle")) continue;
    if (node.classList.contains("te-track")) {
      out.push(trackElement(node));
      continue;
    }
    if (node.tagName === "A") {
      out.push({
        type: "link",
        url: node.getAttribute("href") ?? "",
        children: phrasingFrom(node),
      });
      continue;
    }
    if (node.tagName === "IMG") {
      out.push({
        type: "image",
        url: node.getAttribute("src") ?? "",
        alt: node.getAttribute("alt") ?? "",
      });
      continue;
    }
    if (node.tagName === "STRONG") {
      out.push({ type: "strong", children: phrasingFrom(node) });
      continue;
    }
    if (node.tagName === "I" || node.tagName === "EM") {
      out.push({ type: "emphasis", children: phrasingFrom(node) });
      continue;
    }
    out.push(...phrasingFrom(node));
  }
  return out;
}

function trackElement(track: HTMLElement): MdxJsxTextElement {
  const toggles = [...track.querySelectorAll(".te-toggle")];
  const shape = toggleShape(toggles[0]);
  const filled = toggles.filter((toggle) => isChecked(toggle)).length;
  const interactive = track.dataset.interactive === "1";
  const fillAttr = interactive
    ? attribute("defaultValue", String(filled))
    : attribute("value", String(filled));
  return {
    type: "mdxJsxTextElement",
    attributes: [
      attribute("shape", shape),
      fillAttr,
      attribute("max", String(toggles.length)),
    ],
    children: [],
    name: "Track",
  };
}

// remark-mdx has no frontmatter support, so a leading YAML block would parse
// as thematic breaks and garbage paragraphs. Cut it off up front and keep it
// as an opaque atom instead.
const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

// The source currently being converted by mdxToHtml, so nested handlers can
// slice the original text of nodes they preserve as opaque atoms. Module-level
// because the conversion is synchronous and the handlers are deeply recursive.
let mdxSource = "";

function sliceSource(node: RootContent | PhrasingContent): string | null {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return start != null && end != null ? mdxSource.slice(start, end) : null;
}

function flowSource(node: RootContent): string {
  return (
    sliceSource(node) ??
    processor.stringify({ type: "root", children: [node] }).trimEnd()
  );
}

function phrasingSource(node: PhrasingContent): string {
  return (
    sliceSource(node) ??
    processor
      .stringify({
        type: "root",
        children: [{ type: "paragraph", children: [node] }],
      })
      .trimEnd()
  );
}

export function mdxToHtml(mdx: string): string {
  const frontmatter = FRONTMATTER_RE.exec(mdx)?.[0] ?? "";
  const body = mdx.slice(frontmatter.length);
  mdxSource = body;
  try {
    const tree = processor.parse(body);
    const container = document.createElement("div");
    if (frontmatter) container.append(buildJsxElement(frontmatter.trimEnd()));
    for (const node of tree.children) {
      const el = blockToDom(node);
      if (el) container.append(el);
    }
    return container.innerHTML;
  } finally {
    mdxSource = "";
  }
}

function blockToDom(node: RootContent): HTMLElement | null {
  switch (node.type) {
    case "heading": {
      const el = document.createElement(node.depth <= 1 ? "h1" : "h2");
      appendPhrasing(el, node.children);
      return el;
    }
    case "list":
      return listToDom(node);
    case "mdxFlowExpression":
      return buildJsxElement(flowSource(node));
    case "mdxjsEsm":
      return buildJsxElement(node.value);
    case "mdxJsxFlowElement":
      return flowElementToDom(node) ?? buildJsxElement(flowSource(node));
    case "paragraph": {
      const only = node.children.length === 1 ? node.children[0] : null;
      if (only?.type === "mdxJsxTextElement" && only.name === "Line")
        return lineToDom(only);
      const el = document.createElement("p");
      appendPhrasing(el, node.children);
      return el;
    }
    default:
      return "children" in node ? salvageBlock(node.children) : null;
  }
}

function salvageBlock(children: RootContent[]): HTMLElement | null {
  const el = document.createElement("p");
  appendBlocksInline(el, children);
  return el.childNodes.length > 0 ? el : null;
}

function listToDom(list: List): HTMLElement {
  const el = document.createElement(list.ordered ? "ol" : "ul");
  for (const item of list.children) el.append(listItemToDom(item));
  return el;
}

function listItemToDom(item: ListItem): HTMLElement {
  const li = document.createElement("li");
  const isTask = item.checked === true || item.checked === false;
  if (isTask) {
    li.className = "te-task";
    li.append(buildToggleElement("square", item.checked === true));
  }
  appendBlocksInline(li, item.children);
  return li;
}

function lineToDom(node: MdxJsxFlowElement | MdxJsxTextElement): HTMLElement {
  const el = document.createElement("p");
  el.className =
    attributeOf(node, "kind") === "chevron" ? "te-chevron" : "te-arrow";
  if (node.type === "mdxJsxFlowElement") appendBlocksInline(el, node.children);
  else appendPhrasing(el, node.children);
  return el;
}

function flowElementToDom(node: MdxJsxFlowElement): HTMLElement | null {
  if (node.name === "Line") return lineToDom(node);
  if (node.name === "Move") return moveToDom(node);
  if (node.name === "Track") {
    const el = document.createElement("p");
    el.append(trackToDom(node));
    return el;
  }
  return null;
}

function moveToDom(node: MdxJsxFlowElement): HTMLElement {
  const { title, id, body } = resolveMoveFromMdx(node);
  const bodyEls: HTMLElement[] = [];
  for (const child of body) {
    const childEl = blockToDom(child);
    if (childEl) bodyEls.push(childEl);
  }
  const el = buildMoveElement(title, id, bodyEls);
  // Stash the original attributes (minus title, which round-trips as the
  // heading) so saving the card re-emits them. Serialized through the same
  // processor so expression values survive too.
  const attributes = node.attributes.filter(
    (attr) => !(attr.type === "mdxJsxAttribute" && attr.name === "title"),
  );
  if (attributes.length > 0) {
    el.dataset.moveAttrs = processor
      .stringify({
        type: "root",
        children: [
          { type: "mdxJsxFlowElement", name: "Move", attributes, children: [] },
        ],
      })
      .trimEnd();
  }
  return el;
}

function appendBlocksInline(
  parent: HTMLElement,
  children: RootContent[],
): void {
  for (const child of children) {
    if (child.type === "paragraph") {
      appendPhrasing(parent, child.children);
    } else if (child.type === "mdxJsxFlowElement") {
      if (child.name === "Track") parent.append(trackToDom(child));
      else if (child.name === "Line") parent.append(lineToDom(child));
      else appendBlocksInline(parent, child.children);
    } else if ("children" in child) {
      appendBlocksInline(parent, child.children);
    } else if ("value" in child) {
      parent.append(document.createTextNode(child.value));
    }
  }
}

function appendPhrasing(parent: HTMLElement, nodes: PhrasingContent[]): void {
  for (const node of nodes) {
    switch (node.type) {
      case "break":
        parent.append(document.createElement("br"));
        break;
      case "emphasis": {
        const el = document.createElement("i");
        appendPhrasing(el, node.children);
        parent.append(el);
        break;
      }
      case "inlineCode":
        parent.append(document.createTextNode(node.value));
        break;
      case "link": {
        const el = document.createElement("a");
        el.setAttribute("href", node.url);
        appendPhrasing(el, node.children);
        parent.append(el);
        break;
      }
      case "image": {
        const el = document.createElement("img");
        el.setAttribute("src", node.url);
        if (node.alt) el.setAttribute("alt", node.alt);
        parent.append(el);
        break;
      }
      case "mdxJsxTextElement":
        if (node.name === "Track") parent.append(trackToDom(node));
        else parent.append(buildJsxElement(phrasingSource(node), true));
        break;
      case "strong": {
        const el = document.createElement("strong");
        appendPhrasing(el, node.children);
        parent.append(el);
        break;
      }
      case "text":
        parent.append(document.createTextNode(node.value));
        break;
      default:
        if ("children" in node) appendPhrasing(parent, node.children);
        else if ("value" in node)
          parent.append(document.createTextNode(node.value));
    }
  }
}

function trackToDom(node: MdxJsxFlowElement | MdxJsxTextElement): HTMLElement {
  const { shape, fill, max, interactive } = resolveTrackProps({
    shape: attributeOf(node, "shape"),
    value: attributeOf(node, "value"),
    defaultValue: attributeOf(node, "defaultValue"),
    max: attributeOf(node, "max"),
  });

  const track = buildTrackElement(shape, max);
  if (interactive) track.dataset.interactive = "1";
  const toggles = track.querySelectorAll(".te-toggle");
  for (let i = 0; i < fill; i++) {
    toggles[i]?.setAttribute("aria-checked", "true");
  }
  return track;
}

function attribute(name: string, value: string): MdxJsxAttribute {
  return { type: "mdxJsxAttribute", name, value };
}

function attributeOf(
  node: MdxJsxFlowElement | MdxJsxTextElement,
  name: string,
): string | undefined {
  for (const attr of node.attributes)
    if (
      attr.type === "mdxJsxAttribute" &&
      attr.name === name &&
      typeof attr.value === "string"
    )
      return attr.value;
  return undefined;
}

function toggleShape(toggle: Element | undefined): Shape {
  const raw = toggle instanceof HTMLElement ? toggle.dataset.shape : undefined;
  return TRACK_SHAPES.has(raw as Shape) ? (raw as Shape) : "square";
}

function isChecked(toggle: Element): boolean {
  return toggle.getAttribute("aria-checked") === "true";
}

function toggleChecked(li: HTMLElement): boolean {
  const toggle = li.querySelector(".te-toggle");
  return toggle ? isChecked(toggle) : false;
}

function text(value: string): PhrasingContent {
  return { type: "text", value };
}

function normalizeText(value: string): string {
  return value.replaceAll("​", "").replaceAll(" ", " ");
}
