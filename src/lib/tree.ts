export type Inline = string | Ex;
export type Ex = { base: string; q: string; into: Inline[] | { node: string } };
export type Answer = { say: string; to: string };
export type Node = { id: string; say: Inline[]; answers: Answer[] };
export type Tree = { root: string; nodes: Record<string, Node> };

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
  while (i < s.length) {
    if (s.startsWith("[[", i)) {
      if (buf) {
        out.push(buf);
        buf = "";
      }
      const close = matchClose(s, i);
      out.push(parseEx(s.slice(i + 2, close)));
      i = close + 2;
    } else {
      buf += s[i];
      i++;
    }
  }
  if (buf) out.push(buf);
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
    const m = line.match(ANSWER);
    if (m && cur) {
      cur.answers.push({ say: m[1]!, to: m[2]!.trim() });
      continue;
    }
    say.push(line);
  }
  flush();
  return { root: root ?? Object.keys(nodes)[0] ?? "", nodes };
}

function demo() {
  const a = (cond: boolean, msg: string) => {
    if (!cond) throw new Error("FAIL: " + msg);
  };

  const nested = parseInline("see [[a | q1 | b [[c | q2 | d]] e]] ok");
  const ex = nested[1] as Ex;
  a(ex.base === "a" && ex.q === "q1", "outer base/q");
  const inner = (ex.into as Inline[]).find(
    (x): x is Ex => typeof x !== "string",
  )!;
  a(inner.base === "c" && inner.q === "q2", "nested expansion parsed");

  const node = parseInline("[[the Looter | who?! | -> 7]]")[0] as Ex;
  a((node.into as { node: string }).node === "7", "result -> node ref");

  const t = parse(`@root 1
== 1
Hey there?
- "yes" -> 2
- "blog" -> https://haspar.us
== 2
This is [[the Looter | who?! | my alter ego]].`);
  a(t.root === "1", "root");
  a(t.nodes["1"]!.answers.length === 2, "two answers");
  a(t.nodes["1"]!.answers[1]!.to === "https://haspar.us", "url target");
  a((t.nodes["2"]!.say[1] as Ex).base === "the Looter", "node body expansion");
  a(t.nodes["2"]!.answers.length === 0, "node 2 is a terminal");

  console.log("ok — all checks pass");
}

if (import.meta.url === `file://${process.argv[1]}`) demo();
