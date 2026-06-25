import { slugFromTitle } from "./move-props";

export const MOVE_ARTICLE_CLASS = "te-move group break-inside-avoid py-4";

export function buildMoveElement(
  title: string | undefined,
  id: string | undefined,
  bodyNodes: Node[],
): HTMLElement {
  if (!title) {
    const article = document.createElement("article");
    article.className = "te-move";
    for (const node of bodyNodes) article.append(node);
    return article;
  }

  const moveId = id ?? slugFromTitle(title);
  const article = document.createElement("article");
  article.className = MOVE_ARTICLE_CLASS;

  const flex1 = document.createElement("div");
  flex1.className = "flex-1";

  const headerRow = document.createElement("div");
  headerRow.className = "flex items-center gap-2.5";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = moveId;
  checkbox.name = moveId;
  checkbox.setAttribute("aria-describedby", `${moveId}-title`);
  checkbox.className = "aspect-square shrink-0 -mt-0.75 size-4.5";
  checkbox.setAttribute("contenteditable", "false");

  const h3 = document.createElement("h3");
  h3.id = `${moveId}-title`;
  h3.className =
    "text-neu-800 dark:text-neu-200 font-serif font-bold tracking-wide text-xl [text-box-trim:trim-end]";
  h3.textContent = title;

  headerRow.append(checkbox, h3);
  flex1.append(headerRow);

  const body = document.createElement("div");
  body.className =
    "text-neu-900 dark:text-neu-300 flex flex-col gap-(--block-mb) leading-relaxed mt-2";
  body.dataset.moveBody = "";
  for (const node of bodyNodes) body.append(node);

  flex1.append(body);
  article.append(flex1);
  return article;
}
