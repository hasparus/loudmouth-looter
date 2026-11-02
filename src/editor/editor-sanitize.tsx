import { FLOW_BLOCK_TAGS, MARK_TAGS, markTag } from "./editor-schema";
import { buildMoveElement } from "./move-dom";
import {
  populateJsxElement,
  populateToggleElement,
  type Shape,
} from "./editor-atoms";

export function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function unescapeHtml(text: string) {
  return text
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

export function plainTextToHtml(text: string) {
  return escapeHtml(text.replaceAll(/\r\n?/g, "\n")).replaceAll("\n", "<br>");
}

export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  // eslint-disable-next-line no-control-regex -- Reject protocol-smuggling control characters.
  if (!trimmed || /[\u0000-\u001F\u007F]/.test(trimmed)) return "";
  try {
    const resolved = new URL(trimmed, "https://editor.invalid/");
    return ["http:", "https:", "mailto:"].includes(resolved.protocol)
      ? trimmed
      : "";
  } catch {
    return "";
  }
}

const BARE_URL = /^(?:https?:\/\/|mailto:)\S+$/;

// Text that is nothing but a safe URL, so it can become a link on its own.
export function linkableUrl(text: string): string | null {
  const url = text.trim();
  return BARE_URL.test(url) && sanitizeUrl(url) ? url : null;
}

// A Markdown link target read out of escaped HTML.
export const linkableHref = (escapedUrl: string) =>
  sanitizeUrl(unescapeHtml(escapedUrl));

export function buildLink(href: string, ...content: Node[]) {
  const link = document.createElement("a");
  link.setAttribute("href", href);
  link.setAttribute("rel", "noreferrer");
  link.append(...content);
  return link;
}

export function linkHtml(href: string, innerHtml: string) {
  const link = buildLink(href);
  link.innerHTML = innerHtml;
  return link.outerHTML;
}

export function sanitizeImageSrc(src: string): string {
  const trimmed = src.trim();
  if (/^data:image\/(png|jpeg|gif|webp|avif);/i.test(trimmed)) return trimmed;
  return sanitizeUrl(trimmed);
}

const ALLOWED_TAGS = new Set([
  ...FLOW_BLOCK_TAGS,
  ...MARK_TAGS,
  "ARTICLE",
  "BR",
  "DIV",
  "IMG",
  "INPUT",
  "LI",
]);

const DROPPED_TAGS = new Set([
  "IFRAME",
  "MATH",
  "OBJECT",
  "SCRIPT",
  "STYLE",
  "SVG",
]);

const ATOM_TAGS: Record<string, string> = {
  "te-arrow": "P",
  "te-chevron": "P",
  "te-move": "ARTICLE",
  "te-task": "LI",
  "te-toggle": "BUTTON",
  "te-track": "SPAN",
};
const SHAPES = new Set(["circle", "rhomb", "square"]);

// Code blocks hold plain text only: highlighter spans are flattened and <br>s
// (from rich-text sources) become newlines.
function preText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node instanceof Element && node.tagName === "BR") return "\n";
  if (node instanceof Element && DROPPED_TAGS.has(node.tagName.toUpperCase()))
    return "";
  let text = "";
  for (const child of node.childNodes) {
    text += preText(child);
    // Line-per-element code (some highlighters) ends each line with a block.
    if (
      child instanceof Element &&
      (child.tagName === "DIV" || child.tagName === "P") &&
      !text.endsWith("\n")
    )
      text += "\n";
  }
  return text;
}

// A code block's language label (the fence info string), as stored.
export const CODE_LANGUAGE = /[\w+#.-]{1,32}/;
const LANGUAGE_RE = new RegExp(`^${CODE_LANGUAGE.source}$`);

function codeLanguage(pre: HTMLElement): string {
  const candidates = [
    pre.dataset.lang,
    pre.dataset.language,
    ...[pre, pre.querySelector("code")].flatMap((el) =>
      [...(el?.classList ?? [])]
        .filter((name) => name.startsWith("language-"))
        .map((name) => name.slice("language-".length)),
    ),
  ];
  return candidates.find((lang) => !!lang && LANGUAGE_RE.test(lang)) ?? "";
}

// Move cards are rebuilt whole, like the other atoms: buildMoveElement
// restores the card layout and the data-move-body marker the serializer
// reads, from the card's title, id and body.
function sanitizeMove(card: HTMLElement): HTMLElement {
  const body = card.querySelector<HTMLElement>("[data-move-body]");
  const title = body
    ? [...card.querySelectorAll("h3")].find((h3) => !body.contains(h3))
    : undefined;
  const content = document.createElement("div");
  sanitizeInto(body ?? card, content);
  const id = card.querySelector('input[type="checkbox"]')?.id ?? "";
  const move = buildMoveElement(
    title?.textContent.trim() || undefined,
    /^[\w-]+$/.test(id) ? id : undefined,
    [...content.childNodes],
  );
  // Preserved Move attributes; inert text, only read by the remark
  // serializer on save.
  if (card.dataset.moveAttrs) move.dataset.moveAttrs = card.dataset.moveAttrs;
  return move;
}

function sanitizeInto(source: ParentNode, target: ParentNode) {
  for (const child of source.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.append(child.cloneNode(false));
      continue;
    }
    if (!(child instanceof Element)) continue;

    const rawTag = child.tagName.toUpperCase();
    const tag = markTag(rawTag);

    if (DROPPED_TAGS.has(tag)) continue;

    const classAttr = child.getAttribute("class");

    // Opaque MDX atoms (preserved JSX, imports, frontmatter): rebuild the
    // whole chip from data-mdx instead of trusting its inner HTML. The
    // payload is inert — it only ever reaches the remark serializer.
    if (
      (classAttr === "te-jsx" && tag === "DIV") ||
      (classAttr === "te-jsx-inline" && tag === "SPAN")
    ) {
      const mdx = child instanceof HTMLElement ? (child.dataset.mdx ?? "") : "";
      if (!mdx.trim()) continue;
      const el = document.createElement(tag.toLowerCase());
      populateJsxElement(el, mdx, classAttr === "te-jsx-inline");
      target.append(el);
      continue;
    }

    // Atoms carry layout classes beside their own, so look for the token.
    const atomClass = [...child.classList].find(
      (name) => ATOM_TAGS[name] === tag,
    );
    if (atomClass === "te-move" && child instanceof HTMLElement) {
      target.append(sanitizeMove(child));
      continue;
    }
    if (atomClass && child instanceof HTMLElement) {
      const el = document.createElement(tag.toLowerCase());
      el.className = atomClass;
      if (atomClass === "te-track") {
        el.setAttribute("contenteditable", "false");
        if (child.dataset.interactive === "1") el.dataset.interactive = "1";
      }
      if (atomClass === "te-toggle") {
        const rawShape = child.dataset.shape ?? "";
        const shape = (SHAPES.has(rawShape) ? rawShape : "square") as Shape;
        populateToggleElement(
          el,
          shape,
          child.getAttribute("aria-checked") === "true",
        );
      }
      target.append(el);
      sanitizeInto(child, el);
      continue;
    }

    if (tag === "A") {
      const href = sanitizeUrl(child.getAttribute("href") ?? "");
      if (!href) {
        sanitizeInto(child, target);
        continue;
      }
      const el = buildLink(href);
      target.append(el);
      sanitizeInto(child, el);
      continue;
    }

    if (tag === "PRE") {
      const el = document.createElement("pre");
      const lang = child instanceof HTMLElement ? codeLanguage(child) : "";
      if (lang) el.dataset.lang = lang;
      el.textContent = preText(child);
      target.append(el);
      continue;
    }

    if (tag === "IMG") {
      const src = sanitizeImageSrc(child.getAttribute("src") ?? "");
      if (!src) continue;
      const el = document.createElement("img");
      el.setAttribute("src", src);
      const alt = child.getAttribute("alt");
      if (alt) el.setAttribute("alt", alt);
      target.append(el);
      continue;
    }

    if (tag === "INPUT") {
      if (child.getAttribute("type") !== "checkbox") {
        sanitizeInto(child, target);
        continue;
      }
      const el = document.createElement("input");
      el.setAttribute("type", "checkbox");
      for (const name of ["id", "name", "class", "aria-describedby"]) {
        const value = child.getAttribute(name);
        if (value) el.setAttribute(name, value);
      }
      if (child.getAttribute("contenteditable") === "false")
        el.setAttribute("contenteditable", "false");
      target.append(el);
      continue;
    }

    if (ALLOWED_TAGS.has(tag)) {
      const el = document.createElement(tag.toLowerCase());
      target.append(el);
      sanitizeInto(child, el);
      continue;
    }

    sanitizeInto(child, target);
  }
}

export function sanitizeHtml(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  const clean = document.createElement("div");
  sanitizeInto(template.content, clean);
  return clean.innerHTML;
}
