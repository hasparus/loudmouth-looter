import { createSignal, For, Show } from "solid-js";
import type { Tree, Inline, Ex } from "./tree";

const renderInline = (md: string) =>
  md
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/[_*]([^_*]+)[_*]/g, "<em>$1</em>");
const isUrl = (s: string) => /^https?:\/\//.test(s);
const isNodeRef = (into: Ex["into"]): into is { node: string } =>
  !Array.isArray(into);

// ponytail: positional state, no history. Back/restart is a string stack — add when needed (see TODO.md).
export function Dialogue(props: { tree: Tree }) {
  const [id, setId] = createSignal(props.tree.root);
  const node = () => props.tree.nodes[id()]!;
  return (
    <div>
      <p>
        <Prose say={node().say} onNav={setId} />
      </p>
      <For each={node().answers}>
        {(a) =>
          isUrl(a.to) ? (
            <a href={a.to}>{a.say}</a>
          ) : (
            <button onClick={() => setId(a.to)}>{a.say}</button>
          )
        }
      </For>
    </div>
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
          title={props.ex.q}
          onClick={() => props.onNav((props.ex.into as { node: string }).node)}
        >
          {props.ex.base}
        </button>
      }
    >
      <span>
        <button title={props.ex.q} onClick={() => setOpen(!open())}>
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
