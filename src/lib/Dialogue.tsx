import { slotText } from "slot-text";
import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { Portal } from "solid-js/web";

import { SLOT_TEXT_OPTIONS } from "./animations";
import styles from "./Dialogue.module.css";
import { Link } from "./Link";
import type { Answer, Ex, Inline, Mark, Tree } from "./tree";

import "slot-text/style.css";

const inlineToText = (part: Inline): string =>
  typeof part === "string"
    ? part
    : "em" in part
      ? part.em
      : "strong" in part
        ? part.strong
        : "link" in part
          ? part.link
          : "img" in part
            ? part.img
            : part.base;

const isUrl = (s: string) => /^https?:\/\//.test(s);
const isNodeRef = (into: Ex["into"]): into is { node: string } =>
  !Array.isArray(into);

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const reduceMotion = () =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const TRIGGER =
  "cursor-pointer border-0 bg-transparent p-0 text-inherit underline decoration-dotted decoration-accent-400/70 decoration-[1.5px] underline-offset-[0.2em] transition-colors duration-150 ease-out hover:text-accent-700 hover:decoration-accent-500 active:opacity-70 dark:decoration-accent-400/60 dark:hover:text-accent-400 dark:hover:decoration-accent-400";

const OPEN = "cursor-text select-text border-0 bg-transparent p-0 text-inherit";

export function Dialogue(props: { tree: Tree }) {
  // eslint-disable-next-line solid/reactivity -- seeds the signal once; the tree root is static
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
    // eslint-disable-next-line solid/reactivity -- runs from a handler, not a tracked scope
    navigate(() => setStack([...stack(), to]));
  };
  // eslint-disable-next-line solid/reactivity -- runs from a handler, not a tracked scope
  const back = () => navigate(() => setStack(stack().slice(0, -1)));
  // eslint-disable-next-line solid/reactivity -- runs from a handler, not a tracked scope
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
        class="transition-[opacity,filter,transform] duration-220 ease-[cubic-bezier(0.23,1,0.32,1)] data-[shown=false]:-translate-y-1 data-[shown=false]:opacity-0 data-[shown=false]:blur-[3px] data-[shown=false]:duration-110"
        data-shown={shown() ? "true" : "false"}
      >
        <p class="text-neu-800 dark:text-neu-300 leading-relaxed">
          <Prose say={node().say} onNav={select} />{" "}
          <Show when={stack().length > 1}>
            <span class="text-neu-500 dark:text-neu-400 ml-3 inline-flex">
              <button
                type="button"
                class="hover:text-accent-700 dark:hover:text-accent-400 relative inline-flex cursor-pointer items-center border-0 bg-transparent px-1 transition-colors before:absolute before:-inset-1"
                onClick={back}
              >
                <span aria-hidden>⇜</span>
                <span class="sr-only">back</span>
              </button>
              <Show when={stack().length > 2}>
                <button
                  type="button"
                  class="hover:text-accent-700 dark:hover:text-accent-400 relative inline-flex cursor-pointer items-center border-0 bg-transparent px-1 transition-colors before:absolute before:-inset-1"
                  onClick={restart}
                >
                  <span aria-hidden>↺</span>
                  <span class="sr-only">back to start</span>
                </button>
              </Show>
            </span>
          </Show>
        </p>
        <ol class="mt-5 flex list-none flex-col pl-0">
          <For each={node().answers}>
            {(a, i) => (
              <li
                class="m-0"
                classList={{ [styles.optionIn!]: animate() }}
                style={{ "--i": i() }}
              >
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
    "group flex w-full items-center gap-3 py-0.5 text-left text-neu-800 no-underline transition-colors hover:text-accent-700 hover:duration-0 dark:text-neu-300 dark:hover:text-accent-400 px-3 -mx-3";

  const inner = (
    <>
      <span class="text-neu-500 dark:text-neu-400 group-hover:text-accent-700 dark:group-hover:text-accent-400 shrink-0 tabular-nums transition-colors">
        {props.n}
      </span>
      <span>
        <For each={props.answer.say}>{(m) => <MarkView mark={m} />}</For>
      </span>
    </>
  );

  return (
    <Show
      when={isUrl(props.answer.to)}
      fallback={
        <button
          type="button"
          class={cls}
          onClick={() => props.onNav(props.answer.to)}
        >
          {inner}
        </button>
      }
    >
      <a href={props.answer.to} class={cls}>
        {inner}
      </a>
    </Show>
  );
}

function Prose(props: { say: Inline[]; onNav: (node: string) => void }) {
  return (
    <For each={props.say}>
      {(part) =>
        typeof part !== "string" && "base" in part ? (
          <Expand ex={part} onNav={props.onNav} />
        ) : (
          <MarkView mark={part} />
        )
      }
    </For>
  );
}

/** Render one inline mark: text, _em_, a [link], or an ![image] meme. */
function MarkView(props: { mark: Mark }) {
  // eslint-disable-next-line solid/reactivity -- a mark is immutable once rendered
  const m = props.mark;
  // eslint-disable-next-line solid/components-return-once -- narrowing requires the ternary
  return typeof m === "string" ? (
    <>{m}</>
  ) : "em" in m ? (
    <em>{m.em}</em>
  ) : "strong" in m ? (
    <strong>{m.strong}</strong>
  ) : "img" in m ? (
    <MemeLink alt={m.img} src={m.href} />
  ) : (
    <Link href={m.href}>{m.link}</Link>
  );
}

/**
 * An image link. On touch it's a plain link to the self-hosted image; on a
 * device with a real pointer, clicking does nothing and the image floats below
 * the cursor while hovering the text.
 */
function MemeLink(props: { alt: string; src: string }) {
  const [pos, setPos] = createSignal<{ x: number; y: number } | null>(null);
  let img!: HTMLImageElement;
  let onExitEnd: ((event: AnimationEvent) => void) | undefined;
  const hoverable = () =>
    typeof matchMedia !== "undefined" && matchMedia("(hover: hover)").matches;
  const track = (event: MouseEvent) => {
    if (!hoverable()) return;
    if (img?.classList.contains("animate-bounce-out")) {
      img.getAnimations().forEach((a) => a.cancel());
      img.classList.remove("animate-bounce-out");
      if (onExitEnd) {
        img.removeEventListener("animationend", onExitEnd);
        onExitEnd = undefined;
      }
    }
    setPos({ x: event.clientX, y: event.clientY });
  };
  const leave = () => {
    if (!pos() || reduceMotion()) {
      setPos(null);
      return;
    }
    img.classList.remove("animate-bounce-in");
    img.classList.add("animate-bounce-out");
    onExitEnd = (event: AnimationEvent) => {
      if (event.target !== img) return;
      img.removeEventListener("animationend", onExitEnd!);
      onExitEnd = undefined;
      setPos(null);
      img.classList.remove("animate-bounce-out");
    };
    img.addEventListener("animationend", onExitEnd);
  };

  return (
    <>
      <a
        href={props.src}
        target="_blank"
        rel="noopener noreferrer"
        class="decoration-neu-400 dark:decoration-neu-500 text-inherit underline decoration-dotted decoration-[1.5px] underline-offset-[0.2em]"
        style={{ cursor: "image-set(var(--cur-help)) 16 16, help" }}
        onMouseEnter={track}
        onMouseMove={track}
        onMouseLeave={leave}
        onClick={(event) => hoverable() && event.preventDefault()}
      >
        {props.alt}
      </a>
      <Show when={hoverable() && pos()}>
        {(p) => (
          <Portal>
            <img
              ref={img}
              src={props.src}
              alt={props.alt}
              class="border-neu-300 dark:border-neu-700 animate-bounce-in pointer-events-none fixed z-50 max-w-2xl origin-top-left rounded-sm border shadow-2xl"
              style={{ left: `${p().x}px`, top: `${p().y + 20}px` }}
            />
          </Portal>
        )}
      </Show>
    </>
  );
}

function Expand(props: { ex: Ex; onNav: (node: string) => void }) {
  // eslint-disable-next-line solid/reactivity -- an expand's target is fixed once rendered
  const into = props.ex.into;

  if (isNodeRef(into)) {
    // eslint-disable-next-line solid/components-return-once -- static expand; shape is decided once
    return (
      <button
        type="button"
        class={TRIGGER}
        title={props.ex.q}
        onClick={() => props.onNav(into.node)}
      >
        {props.ex.base}
      </button>
    );
  }

  const [open, setOpen] = createSignal(false);
  let btn!: HTMLButtonElement;
  onMount(() => {
    const roll = slotText(btn, props.ex.base);
    createEffect(() => {
      if (open()) roll.set(into.map(inlineToText).join(""), SLOT_TEXT_OPTIONS);
    });
    onCleanup(() => roll.destroy());
  });
  return (
    <button
      ref={btn}
      type="button"
      class={open() ? OPEN : TRIGGER}
      title={props.ex.q}
      aria-expanded={open()}
      onClick={() => setOpen(true)}
    >
      {props.ex.base}
    </button>
  );
}
