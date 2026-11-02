// Clipboard → editor: images, rich HTML, Markdown and plain text.

import {
  normalizeEmptyBlocks,
  restorePendingImageFallbacks,
} from "./editor-dom";
import {
  htmlIsThinTextWrapper,
  markdownPasteHtml,
} from "./editor-markdown-paste";
import {
  buildLink,
  linkableUrl,
  plainTextToHtml,
  sanitizeHtml,
  sanitizeImageSrc,
} from "./editor-sanitize";
import { isFlowBlock } from "./editor-schema";
import {
  closestWithin,
  editorRange,
  getCurrentBlock,
  select,
} from "./editor-selection";

export type ImageSettlement = { id: string; html: string };
type PasteCommit = (image?: ImageSettlement) => void;
let nextPendingImageId = 0;

function insertImageFile(
  editor: HTMLElement,
  file: File,
  onCommit: PasteCommit,
) {
  const range = editorRange(editor)?.cloneRange();
  if (!range || !/^image\/(png|jpeg|gif|webp|avif)$/.test(file.type)) return;

  const previous = range.cloneContents();
  restorePendingImageFallbacks(previous);
  const container = document.createElement("div");
  container.append(previous.cloneNode(true));
  const previousHtml = container.innerHTML;
  const preview = URL.createObjectURL(file);
  const id = String(++nextPendingImageId);
  const img = document.createElement("img");
  img.src = preview;
  img.dataset.pendingImage = id;
  img.dataset.pendingFallback = previousHtml;
  range.deleteContents();
  range.insertNode(img);
  range.setStartAfter(img);
  range.collapse(true);
  select(range);

  const currentImage = () =>
    editor.isConnected
      ? editor.querySelector<HTMLImageElement>(
          `img[data-pending-image="${id}"]`,
        )
      : null;
  const fail = () => {
    const target = currentImage();
    URL.revokeObjectURL(preview);
    if (!target) return;
    target.replaceWith(previous);
    onCommit({ id, html: previousHtml });
  };
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const src =
      typeof reader.result === "string" ? sanitizeImageSrc(reader.result) : "";
    if (!src) {
      fail();
      return;
    }
    const target = currentImage();
    URL.revokeObjectURL(preview);
    if (!target) return;
    target.src = src;
    delete target.dataset.pendingImage;
    delete target.dataset.pendingFallback;
    onCommit({ id, html: target.outerHTML });
  });
  reader.addEventListener("error", fail);
  reader.addEventListener("abort", fail);
  try {
    reader.readAsDataURL(file);
  } catch {
    fail();
  }
}

// Pastes rich HTML, Markdown or plain text as prose. (Code contexts take
// plain text — see pasteLiteral.)
export function handleEditorPaste(
  editor: HTMLElement,
  clipboard: DataTransfer,
  onCommit: PasteCommit,
) {
  const imageFile = [...clipboard.files].find((file) =>
    file.type.startsWith("image/"),
  );
  if (imageFile) {
    insertImageFile(editor, imageFile, onCommit);
    return;
  }

  const range = editorRange(editor)?.cloneRange();
  if (!range) return;
  const currentBlock = getCurrentBlock(editor, range.startContainer);
  const html = clipboard.getData("text/html");
  const text = clipboard.getData("text/plain");

  // A URL pasted over selected prose links the selection.
  const url = linkableUrl(text);
  if (
    url &&
    !range.collapsed &&
    currentBlock?.contains(range.endContainer) &&
    !closestWithin(range.startContainer, "a", editor) &&
    !closestWithin(range.endContainer, "a", editor)
  ) {
    const link = buildLink(url, range.extractContents());
    range.insertNode(link);
    range.selectNodeContents(link);
    select(range);
    onCommit();
    return;
  }

  const explicitMarkdown = clipboard.getData("text/markdown");
  let cleanHtml = html
    ? sanitizeHtml(html)
    : plainTextToHtml(text || explicitMarkdown);
  let inlineMarkdown = false;

  const markdown = explicitMarkdown.trim() ? explicitMarkdown : text;
  if (markdown && htmlIsThinTextWrapper(html, markdown)) {
    const parsed = markdownPasteHtml(markdown, !!explicitMarkdown.trim());
    if (parsed) {
      cleanHtml = sanitizeHtml(parsed.html);
      inlineMarkdown = parsed.inline;
    }
  }

  range.deleteContents();

  const template = document.createElement("template");
  template.innerHTML = cleanHtml;
  const content = template.content;
  if (
    inlineMarkdown &&
    currentBlock &&
    currentBlock.contains(range.startContainer) &&
    currentBlock.contains(range.endContainer) &&
    content.childElementCount === 1 &&
    content.firstElementChild?.tagName === "P"
  ) {
    content.replaceChildren(...content.firstElementChild.childNodes);
  }
  const hasBlockChild = [...content.childNodes].some(isFlowBlock);

  if (!hasBlockChild || !currentBlock) {
    const lastNode = content.lastChild;
    range.insertNode(content);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
    }
    select(range);
    normalizeEmptyBlocks(editor);
    onCommit();
    return;
  }

  const list = currentBlock.closest("ul, ol");
  const insertAfter =
    currentBlock.tagName === "LI" && list ? list : currentBlock;
  const shouldSplitTail = insertAfter === currentBlock;

  let tail: DocumentFragment | null = null;
  if (shouldSplitTail) {
    const tailRange = document.createRange();
    tailRange.setStart(range.endContainer, range.endOffset);
    tailRange.setEndAfter(currentBlock.lastChild ?? currentBlock);
    tail = tailRange.extractContents();
  }

  let previous: ChildNode = insertAfter;
  for (const node of [...content.childNodes]) {
    if (isFlowBlock(node)) {
      previous.after(node);
      previous = node;
    } else {
      const wrapper = document.createElement("p");
      wrapper.append(node);
      previous.after(wrapper);
      previous = wrapper;
    }
  }

  if (tail && tail.childNodes.length > 0) {
    const tailBlock = document.createElement("p");
    tailBlock.append(tail);
    previous.after(tailBlock);
  }

  if (previous instanceof HTMLElement) {
    range.selectNodeContents(previous);
    range.collapse(false);
  }
  select(range);
  normalizeEmptyBlocks(editor);
  onCommit();
}
