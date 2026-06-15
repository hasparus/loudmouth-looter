import { createSignal, For, type JSX, onMount, Show } from "solid-js";

import "./DialogueIntro.css";

type NodeId =
  | "gate"
  | "made"
  | "deny"
  | "whoami"
  | "systems"
  | "catch"
  | "alive"
  | "loot";

interface Choice {
  label: string;
  to: NodeId;
}
interface DialogueNode {
  lines: string[];
  /** Optional image the `?` links out to (the looter only shows his face if asked). */
  ask?: string;
  choices?: Choice[];
}

const TREE: Record<NodeId, DialogueNode> = {
  gate: {
    lines: ["hey, you there. you seen any outlaws around here?"],
    ask: "https://i.imgur.com/hzKOvy8.jpeg",
    choices: [
      { label: "you kind of look like one.", to: "made" },
      { label: "nope. no outlaws lately.", to: "deny" },
      { label: "who's asking?", to: "whoami" },
    ],
  },
  made: {
    lines: [
      "ha. takes one to know one.",
      "fine, you got me. this is the archive — my edgy, opinionated alter ego. notes, rants, kitbashes, experiments. maybe a finished game or two.",
    ],
    choices: [
      { label: "kitbashes?", to: "systems" },
      { label: "what's the catch?", to: "catch" },
    ],
  },
  deny: {
    lines: [
      "good. keep it that way.",
      "nothing here but a stash. notes, rants, half-built games i dragged back from places i had no business being.",
    ],
    choices: [
      { label: "back from where?", to: "systems" },
      { label: "what's the catch?", to: "catch" },
    ],
  },
  whoami: {
    lines: [
      "nobody worth the paperwork. just the author with the manners switched off.",
    ],
    choices: [{ label: "fair.", to: "made" }],
  },
  systems: {
    lines: [
      "i like how systems shape the stories we tell. so i yoink stuff off a dozen different games, blabber something incomprehensible about n-dimensional spaces, and make my friends play it.",
      "they keep asking for more. weirdos.",
    ],
    choices: [
      { label: "alright, show me.", to: "loot" },
      { label: "and if i turn you in?", to: "alive" },
    ],
  },
  catch: {
    lines: [
      "no catch. take whatever's worth taking, that's the point.",
      "hope you find something worth stealing.",
    ],
    choices: [{ label: "show me.", to: "loot" }],
  },
  alive: {
    lines: [
      "ha. your type always thinks it's got a chance.",
      "hope you find something worth stealing. but regardless: you won't take me alive.",
    ],
    ask: "https://preview.redd.it/those-looters-really-always-think-they-have-a-chance-v0-gsrkbd1giw881.jpg?width=1080&crop=smart&auto=webp&s=2f19b2866ac7e1d40d94ed456e36d245484b1831",
    choices: [{ label: "(he's gone. the fire's still warm.)", to: "loot" }],
  },
  loot: {
    lines: ["camp's empty. whatever he left behind is below — help yourself."],
  },
};

const prefersReducedMotion = () =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The homepage intro as a tiny swap-style dialogue tree. Picking a reply swaps
 * the looter's lines (cross-fade + height morph, whole sentences — no
 * typewriter). The post list below is always visible; this only dresses up the
 * intro. SSRs the plain prose passed as children for no-JS / crawlers.
 */
export function DialogueIntro(props: { children?: JSX.Element }) {
  const [hydrated, setHydrated] = createSignal(false);
  const [id, setId] = createSignal<NodeId>("gate");
  const [shown, setShown] = createSignal(false);
  const [leaving, setLeaving] = createSignal(false);

  let box: HTMLDivElement | undefined;
  let choicesEl: HTMLUListElement | undefined;

  onMount(() => {
    setHydrated(true);
    requestAnimationFrame(() => setShown(true));
  });

  const node = () => TREE[id()];

  const go = (to: NodeId) => {
    if (leaving()) return;
    const reduced = prefersReducedMotion();
    const from = box?.offsetHeight ?? 0;

    setLeaving(true);
    setShown(false);

    window.setTimeout(
      () => {
        setId(to);
        setLeaving(false);

        requestAnimationFrame(() => {
          if (box && !reduced) {
            const next = box.offsetHeight;
            if (from && next && from !== next) {
              box.style.overflow = "hidden";
              const anim = box.animate(
                [{ height: `${from}px` }, { height: `${next}px` }],
                { duration: 320, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
              );
              anim.onfinish = () => {
                box.style.overflow = "";
              };
            }
          }
          requestAnimationFrame(() => setShown(true));
          queueMicrotask(() =>
            choicesEl?.querySelector<HTMLButtonElement>("button")?.focus(),
          );
        });
      },
      reduced ? 0 : 150,
    );
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const choices = node().choices;
    const n = Number(event.key);
    if (choices && n >= 1 && n <= choices.length) {
      event.preventDefault();
      go(choices[n - 1]!.to);
    }
  };

  return (
    <Show
      when={hydrated()}
      fallback={<div class="dlg-fallback">{props.children}</div>}
    >
      <div
        ref={box}
        class="dlg"
        classList={{ "is-leaving": leaving() }}
        role="group"
        aria-label="a word with the looter"
        onKeyDown={onKeyDown}
      >
        <div class="dlg-lines" aria-live="polite">
          <For each={node().lines}>
            {(line, i) => (
              <p class="dlg-line" classList={{ in: shown() }} style={{ "--i": i() }}>
                {line}
                <Show when={i() === 0 && node().ask}>
                  {(ask) => (
                    <a
                      class="dlg-ask"
                      href={ask()}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="see who's talking"
                    >
                      ?
                    </a>
                  )}
                </Show>
              </p>
            )}
          </For>
        </div>

        <Show
          when={node().choices}
          fallback={
            <button
              type="button"
              class="dlg-replay in"
              style={{ "--i": node().lines.length }}
              onClick={() => go("gate")}
            >
              ↻ start over
            </button>
          }
        >
          {(choices) => (
            <ul
              ref={choicesEl}
              class="dlg-choices"
              classList={{ in: shown() }}
              style={{ "--i": node().lines.length }}
            >
              <For each={choices()}>
                {(choice, i) => (
                  <li>
                    <button
                      type="button"
                      class="dlg-choice"
                      onClick={() => go(choice.to)}
                    >
                      <span class="dlg-num">{i() + 1}</span>
                      <span>{choice.label}</span>
                    </button>
                  </li>
                )}
              </For>
            </ul>
          )}
        </Show>
      </div>
    </Show>
  );
}
