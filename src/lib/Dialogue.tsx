import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Portal } from "solid-js/web";

import type { Answer, Ex, Inline, Tree } from "./tree";

import "./Dialogue.css";

const renderEm = (md: string) => md.replace(/[_*]([^_*]+)[_*]/g, "<em>$1</em>");
const TOKEN = /(!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/g;
const isUrl = (s: string) => /^https?:\/\//.test(s);
const isNodeRef = (into: Ex["into"]): into is { node: string } =>
  !Array.isArray(into);

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const reduceMotion = () =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const TRIGGER =
  "cursor-pointer border-0 bg-transparent p-0 text-inherit underline decoration-neu-400 decoration-dotted underline-offset-2 transition-colors hover:text-accent-700 dark:hover:text-accent-400";

export function Dialogue(props: { tree: Tree }) {
  const [stack, setStack] = createSignal<string[]>([props.tree.root]);
  const id = () => stack()[stack().length - 1]!;
  const node = () => props.tree.nodes[id()]!;

  let box!: HTMLDivElement;
  const [shown, setShown] = createSignal(true);
  const [animate, setAnimate] = createSignal(false);
  let busy = false;

  const navigate = (mutate: () => void) => {
    if (busy) return;
    if (reduceMotion()) {
      mutate();
      return;
    }
    busy = true;
    const from = box.offsetHeight;
    setShown(false);
    window.setTimeout(() => {
      setAnimate(true);
      mutate();
      requestAnimationFrame(() => {
        const to = box.offsetHeight;
        if (from !== to) {
          box.style.overflow = "hidden";
          const anim = box.animate(
            [{ height: `${from}px` }, { height: `${to}px` }],
            { duration: 240, easing: EASE_OUT },
          );
          anim.onfinish = () => (box.style.overflow = "");
        }
        requestAnimationFrame(() => {
          setShown(true);
          busy = false;
        });
      });
    }, 110);
  };

  const select = (to: string) => {
    if (isUrl(to)) {
      window.location.href = to;
      return;
    }
    navigate(() => setStack([...stack(), to]));
  };
  const back = () => navigate(() => setStack(stack().slice(0, -1)));
  const restart = () => navigate(() => setStack([props.tree.root]));

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
      select(answers[n - 1]!.to);
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  return (
    <div ref={box}>
      <div
        class="dlg-content"
        data-shown={shown() ? "true" : "false"}
        data-animate={animate() ? "" : undefined}
      >
        <p class="text-neu-700 dark:text-neu-300 leading-relaxed">
          <Prose say={node().say} onNav={select} />{" "}
          <Show when={stack().length > 1}>
            <div class="text-neu-500 dark:text-neu-400 ml-4 inline-flex gap-2">
              <button
                type="button"
                class="hover:text-accent-700 dark:hover:text-accent-400 flex cursor-pointer items-center gap-1 transition-colors"
                onClick={back}
              >
                <span aria-hidden>⇜</span>
                <span class="sr-only">back</span>
              </button>
              <Show when={stack().length > 2}>
                <button
                  type="button"
                  class="hover:text-accent-700 dark:hover:text-accent-400 flex cursor-pointer items-center gap-1 transition-colors"
                  onClick={restart}
                >
                  <span aria-hidden>↺</span>
                  <span class="sr-only">back to start</span>
                </button>
              </Show>
            </div>
          </Show>
        </p>
        <ol class="mt-5 flex list-none flex-col gap-1 pl-0">
          <For each={node().answers}>
            {(a, i) => (
              <li class="dlg-option m-0" style={{ "--i": i() }}>
                <Choice n={i() + 1} answer={a} onNav={select} />
              </li>
            )}
          </For>
        </ol>
      </div>
    </div>
  );
}

/** One answer row — number marker turns accent on hover; label renders _em_. */
function Choice(props: {
  n: number;
  answer: Answer;
  onNav: (node: string) => void;
}) {
  const cls =
    "group flex w-full items-center gap-3 py-0.5 text-left text-neu-700 no-underline transition-colors hover:text-accent-700 hover:duration-0 dark:text-neu-300 dark:hover:text-accent-400";

  const inner = (
    <>
      <span class="text-neu-500 dark:text-neu-400 group-hover:text-accent-700 dark:group-hover:text-accent-400 shrink-0 tabular-nums transition-colors">
        {props.n}
      </span>
      <span innerHTML={renderEm(props.answer.say)} />
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
          <InlineString text={part} />
        ) : (
          <Expand ex={part} onNav={props.onNav} />
        )
      }
    </For>
  );
}

/** Render a prose string: text (with _em_), [links], and ![image] memes. */
function InlineString(props: { text: string }) {
  const segments = () => {
    const out: {
      html?: string;
      label?: string;
      href?: string;
      img?: boolean;
    }[] = [];
    let last = 0;
    for (const m of props.text.matchAll(TOKEN)) {
      if (m.index > last)
        out.push({ html: renderEm(props.text.slice(last, m.index)) });
      const img = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(m[0]);
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(m[0]);
      if (img) out.push({ label: img[1]!, href: img[2]!, img: true });
      else if (link) out.push({ label: link[1]!, href: link[2]! });
      last = m.index + m[0].length;
    }
    if (last < props.text.length)
      out.push({ html: renderEm(props.text.slice(last)) });
    return out;
  };

  return (
    <For each={segments()}>
      {(s) =>
        s.html !== undefined ? (
          <span innerHTML={s.html} />
        ) : s.img ? (
          <MemeLink alt={s.label!} src={s.href!} />
        ) : (
          <a href={s.href}>{s.label}</a>
        )
      }
    </For>
  );
}

/**
 * An image link. On touch it's a plain link to the self-hosted image; on a
 * device with a real pointer, clicking does nothing and the image floats below
 * the cursor while hovering the text.
 */
function MemeLink(props: { alt: string; src: string }) {
  const [pos, setPos] = createSignal<{ x: number; y: number } | null>(null);
  const hoverable = () =>
    typeof matchMedia !== "undefined" && matchMedia("(hover: hover)").matches;
  const track = (event: MouseEvent) => {
    if (hoverable()) setPos({ x: event.clientX, y: event.clientY });
  };

  return (
    <>
      <a
        href={props.src}
        target="_blank"
        rel="noopener noreferrer"
        class={TRIGGER}
        onMouseEnter={track}
        onMouseMove={track}
        onMouseLeave={() => setPos(null)}
        onClick={(event) => hoverable() && event.preventDefault()}
      >
        {props.alt}
      </a>
      <Show when={pos()}>
        {(p) => (
          <Portal>
            <img
              src={props.src}
              alt={props.alt}
              class="border-neu-300 dark:border-neu-700 pointer-events-none fixed z-50 max-h-80 max-w-xs rounded-sm border shadow-2xl"
              style={{ left: `${p().x}px`, top: `${p().y + 20}px` }}
            />
          </Portal>
        )}
      </Show>
    </>
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
