import { createSignal, For, onCleanup, onMount, Show } from "solid-js";

import type { Answer, Ex, Inline, Tree } from "./tree";

const renderInline = (md: string) =>
  md
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/[_*]([^_*]+)[_*]/g, "<em>$1</em>");
const isUrl = (s: string) => /^https?:\/\//.test(s);
const isNodeRef = (into: Ex["into"]): into is { node: string } =>
  !Array.isArray(into);

const TRIGGER =
  "cursor-pointer border-0 bg-transparent p-0 text-inherit underline decoration-neu-400 decoration-dotted underline-offset-2 transition-colors hover:text-accent-700 dark:hover:text-accent-400";

// ponytail: positional state, no history. Back/restart is a string stack — add when needed (see TODO.md).
export function Dialogue(props: { tree: Tree }) {
  const [id, setId] = createSignal(props.tree.root);
  const node = () => props.tree.nodes[id()]!;

  const go = (a: Answer) =>
    isUrl(a.to) ? (window.location.href = a.to) : setId(a.to);

  onMount(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector("dialog[open]")) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? "")
      )
        return;

      const answers = node().answers;
      const n = Number(event.key);
      if (!Number.isInteger(n) || n < 1 || n > answers.length) return;
      event.preventDefault();
      go(answers[n - 1]!);
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  return (
    <div>
      <p class="text-neu-700 dark:text-neu-300 leading-relaxed">
        <Prose say={node().say} onNav={setId} />
      </p>
      <ol class="mt-5 flex list-none flex-col gap-1 pl-0">
        <For each={node().answers}>
          {(a, i) => (
            <li class="m-0">
              <Choice n={i() + 1} answer={a} onNav={setId} />
            </li>
          )}
        </For>
      </ol>
    </div>
  );
}

/** One answer row — number marker turns accent on hover. */
function Choice(props: {
  n: number;
  answer: Answer;
  onNav: (node: string) => void;
}) {
  const cls =
    "group flex w-full items-center gap-3 py-0.5 text-left text-neu-700 no-underline transition-colors hover:text-accent-700 dark:text-neu-300 dark:hover:text-accent-400";
  const inner = (
    <>
      <span class="text-neu-500 dark:text-neu-400 group-hover:text-accent-700 dark:group-hover:text-accent-400 shrink-0 tabular-nums transition-colors">
        {props.n}
      </span>
      <span>{props.answer.say}</span>
    </>
  );

  return isUrl(props.answer.to) ? (
    <a href={props.answer.to} class={cls}>
      {inner}
    </a>
  ) : (
    <button
      type="button"
      class={cls}
      onClick={() => props.onNav(props.answer.to)}
    >
      {inner}
    </button>
  );
}

function Prose(props: { say: Inline[]; onNav: (node: string) => void }) {
  return (
    <For each={props.say}>
      {(part) =>
        typeof part === "string" ? (
          <span innerHTML={renderInline(part)} />
        ) : (
          <Expand ex={part} onNav={props.onNav} />
        )
      }
    </For>
  );
}

function Expand(props: { ex: Ex; onNav: (node: string) => void }) {
  const [open, setOpen] = createSignal(false);
  return (
    <Show
      when={!isNodeRef(props.ex.into)}
      fallback={
        <button
          type="button"
          class={TRIGGER}
          title={props.ex.q}
          onClick={() => props.onNav((props.ex.into as { node: string }).node)}
        >
          {props.ex.base}
        </button>
      }
    >
      <span>
        <button
          type="button"
          class={TRIGGER}
          title={props.ex.q}
          onClick={() => setOpen(!open())}
        >
          {props.ex.base}
        </button>
        <Show when={open()}>
          {" — "}
          <Prose say={props.ex.into as Inline[]} onNav={props.onNav} />
        </Show>
      </span>
    </Show>
  );
}
