// The editor's document vocabulary: which elements are blocks, which are
// marks, and which browser tags alias which marks. The sanitizer, the MDX
// serializer, the inline transform and the commands all derive from here.

export const MAX_HEADING_LEVEL = 3;
export const HEADING_TAGS = new Set(["H1", "H2", "H3"]);

// Blocks whose content is a single run of prose.
export const TEXT_BLOCK_TAGS = new Set([...HEADING_TAGS, "P"]);

// Blocks the caret edits in: what getCurrentBlock() returns.
export const CARET_BLOCK_TAGS = new Set([...TEXT_BLOCK_TAGS, "LI", "PRE"]);

// Elements that stand as blocks in a flow (the document, a quote, a paste).
export const FLOW_BLOCK_TAGS = new Set([
  ...TEXT_BLOCK_TAGS,
  "BLOCKQUOTE",
  "HR",
  "OL",
  "PRE",
  "UL",
]);

// Browser formatting tags (execCommand, pasted HTML) and their semantic twins.
export const MARK_ALIASES: Readonly<Record<string, string>> = {
  B: "STRONG",
  DEL: "S",
  EM: "I",
  STRIKE: "S",
};

export const markTag = (tag: string) => MARK_ALIASES[tag] ?? tag;

// Inline elements that carry formatting (or must stay literal).
export const MARK_TAGS = new Set([
  "A",
  "CODE",
  "I",
  "S",
  "STRONG",
  ...Object.keys(MARK_ALIASES),
]);

export function headingLevel(tag: string): 1 | 2 | 3 | null {
  if (!HEADING_TAGS.has(tag)) return null;
  return Number(tag.slice(1)) as 1 | 2 | 3;
}

export function headingTag(depth: number): string {
  return `h${Math.min(Math.max(depth, 1), MAX_HEADING_LEVEL)}`;
}

// A flow block, including the editor's own block atoms (Move cards, MDX
// chips) that only the serializer knows how to read.
export function isFlowBlock(node: Node): node is HTMLElement {
  if (!(node instanceof HTMLElement)) return false;
  return (
    FLOW_BLOCK_TAGS.has(node.tagName) ||
    node.classList.contains("te-move") ||
    node.classList.contains("te-jsx")
  );
}

// Elements that separate words, for counting.
export function breaksWords(element: Element): boolean {
  return (
    FLOW_BLOCK_TAGS.has(element.tagName) ||
    CARET_BLOCK_TAGS.has(element.tagName) ||
    element.tagName === "BR"
  );
}
