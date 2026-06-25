/** Label-level inline markup: text, _em_, **bold**, [links] and ![images]. */
export type Mark =
  | string
  | { em: string }
  | { strong: string }
  | { link: string; href: string }
  | { img: string; href: string };
/** Prose adds the `[[ ]]` expansion on top of {@link Mark}. */
export type Inline = Mark | Ex;
export type Ex = { base: string; q: string; into: Inline[] | { node: string } };
export type Answer = { say: Mark[]; to: string };
export type Node = { id: string; say: Inline[]; answers: Answer[] };
export type Tree = { root: string; nodes: Record<string, Node> };

/**
 * img | link | **bold** / __bold__ | _em_ / *em*. One group set per
 * alternative; bold precedes em so `**x**` matches as bold, not stray ems.
 */
const MARK =
  /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|[_*]([^_*]+)[_*]/g;

/** Tokenize a plain string into text/em/bold/link/image marks (no `[[ ]]`). */
export function tokenizeText(s: string): Mark[] {
  const out: Mark[] = [];
  let last = 0;
  for (const m of s.matchAll(MARK)) {
    const i = m.index;
    if (i > last) out.push(s.slice(last, i));
    if (m[1] !== undefined) out.push({ img: m[1], href: m[2]! });
    else if (m[3] !== undefined) out.push({ link: m[3], href: m[4]! });
    else if (m[5] !== undefined || m[6] !== undefined)
      out.push({ strong: m[5] ?? m[6]! });
    else out.push({ em: m[7]! });
    last = i + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

function matchClose(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length - 1; i++) {
    if (s.startsWith("[[", i)) {
      depth++;
      i++;
    } else if (s.startsWith("]]", i)) {
      if (--depth === 0) return i;
      i++;
    }
  }
  throw new Error(`unbalanced [[ ]] in: ${s}`);
}

function splitTopPipes(s: string): string[] {
  const parts: string[] = [];
  let depth = 0,
    cur = "";
  for (let i = 0; i < s.length; i++) {
    if (s.startsWith("[[", i)) {
      depth++;
      cur += "[[";
      i++;
    } else if (s.startsWith("]]", i)) {
      depth--;
      cur += "]]";
      i++;
    } else if (s[i] === "|" && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += s[i];
  }
  parts.push(cur);
  return parts;
}

function parseEx(inner: string): Ex {
  const [base, q, ...rest] = splitTopPipes(inner);
  const result = rest.join("|").trim();
  const into = result.startsWith("->")
    ? { node: result.slice(2).trim() }
    : parseInline(result);
  return { base: (base ?? "").trim(), q: (q ?? "").trim(), into };
}

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  let i = 0,
    buf = "";
  const flush = () => {
    if (buf) out.push(...tokenizeText(buf));
    buf = "";
  };
  while (i < s.length) {
    if (s.startsWith("[[", i)) {
      flush();
      const close = matchClose(s, i);
      out.push(parseEx(s.slice(i + 2, close)));
      i = close + 2;
    } else {
      buf += s[i];
      i++;
    }
  }
  flush();
  return out;
}

const ANSWER = /^- "(.*)" -> (.+)$/;

export function parse(src: string): Tree {
  const nodes: Record<string, Node> = {};
  let root: string | undefined,
    cur: Node | null = null,
    say: string[] = [];
  const flush = () => {
    if (cur) {
      cur.say = parseInline(say.join(" ").trim());
      nodes[cur.id] = cur;
    }
    say = [];
  };
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;
    if (line.startsWith("@root ")) {
      root = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("== ")) {
      flush();
      cur = { id: line.slice(3).trim(), say: [], answers: [] };
      continue;
    }
    const m = ANSWER.exec(line);
    if (m && cur) {
      cur.answers.push({ say: tokenizeText(m[1]!), to: m[2]!.trim() });
      continue;
    }
    say.push(line);
  }
  flush();
  return { root: root ?? Object.keys(nodes)[0] ?? "", nodes };
}
