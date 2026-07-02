
import { populateToggleElement, type Shape } from "./editor-atoms";

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
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return "";
  return trimmed;
}

export function sanitizeImageSrc(src: string): string {
  const trimmed = src.trim();
  if (/^data:image\/(png|jpeg|gif|webp|avif);/i.test(trimmed)) return trimmed;
  return sanitizeUrl(trimmed);
}

const ALLOWED_TAGS = new Set([
  "A",
  "ARTICLE",
  "BR",
  "DIV",
  "H1",
  "H2",
  "H3",
  "I",
  "IMG",
  "INPUT",
  "LI",
  "OL",
  "P",
  "STRONG",
  "UL",
]);

const DROPPED_TAGS = new Set([
  "IFRAME",
  "MATH",
  "OBJECT",
  "SCRIPT",
  "STYLE",
  "SVG",
]);
const TAG_RENAME: Record<string, string> = { B: "STRONG", EM: "I" };

const ATOM_TAGS: Record<string, string> = {
  "te-arrow": "P",
  "te-chevron": "P",
  "te-move": "ARTICLE",
  "te-task": "LI",
  "te-toggle": "BUTTON",
  "te-track": "SPAN",
};
const SHAPES = new Set(["circle", "rhomb", "square"]);

function sanitizeInto(source: ParentNode, target: ParentNode) {
  for (const child of source.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.append(child.cloneNode(false));
      continue;
    }
    if (!(child instanceof Element)) continue;

    const rawTag = child.tagName.toUpperCase();
    const tag = TAG_RENAME[rawTag] ?? rawTag;

    if (DROPPED_TAGS.has(tag)) continue;

    const atomClass = child.getAttribute("class");
    if (
      atomClass &&
      ATOM_TAGS[atomClass] === tag &&
      child instanceof HTMLElement
    ) {
      const el = document.createElement(tag.toLowerCase());
      el.className = atomClass;
      if (atomClass === "te-track") {
        el.setAttribute("contenteditable", "false");
        if (child.dataset.interactive === "1")
          el.dataset.interactive = "1";
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
      const el = document.createElement("a");
      el.setAttribute("href", href);
      el.setAttribute("rel", "noreferrer");
      target.append(el);
      sanitizeInto(child, el);
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
