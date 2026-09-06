import { createSignal, For, onCleanup, Show } from "solid-js";

import { slides, type Slide } from "./slides";

import "./deck.css";

function SlideFrame(props: { slide: Slide; index: number; thumb?: boolean }) {
  return (
    <div
      class="slide"
      classList={{ dark: props.slide.dark, "image-only": props.slide.bare }}
    >
      <Show when={!props.slide.bare}>
        <div class="red-notch" />
      </Show>
      {props.slide.content()}
      <Show when={!props.thumb && !props.slide.bare}>
        <div class="rule-bottom" />
        <div class="footer">
          <span class="series">questoza / prep bez scenariusza</span>
          <span class="folio">
            {String(props.index + 1).padStart(2, "0")} /{" "}
            {String(slides.length).padStart(2, "0")}
          </span>
        </div>
      </Show>
    </div>
  );
}

const wrap = (i: number) =>
  ((i % slides.length) + slides.length) % slides.length;
const hashIndex = () =>
  wrap((Number.parseInt(location.hash.slice(1), 10) || 1) - 1);

export function Deck() {
  const [index, setIndex] = createSignal(hashIndex());
  const [notes, setNotes] = createSignal(false);
  const [overview, setOverview] = createSignal(false);
  const current = () => slides[index()]!;

  const go = (i: number) => {
    setIndex(wrap(i));
    history.replaceState(null, "", `#${index() + 1}`);
  };

  const onHashChange = () => setIndex(hashIndex());
  const onKeyDown = (event: KeyboardEvent) => {
    if (
      event.target instanceof Element &&
      event.target.closest("a") &&
      (event.key === " " || event.key === "Enter")
    ) {
      return;
    }
    const actions: Record<string, () => void> = {
      arrowright: () => go(index() + 1),
      pagedown: () => go(index() + 1),
      " ": () => go(index() + 1),
      arrowleft: () => go(index() - 1),
      pageup: () => go(index() - 1),
      home: () => go(0),
      end: () => go(slides.length - 1),
      n: () => setNotes((on) => !on),
      o: () => setOverview((on) => !on),
      escape: () => setOverview(false),
    };
    const action = actions[event.key.toLowerCase()];
    if (!action) return;
    event.preventDefault();
    action();
  };

  window.addEventListener("hashchange", onHashChange);
  window.addEventListener("keydown", onKeyDown);
  onCleanup(() => {
    window.removeEventListener("hashchange", onHashChange);
    window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <Show
      when={!overview()}
      fallback={
        <div class="overview">
          <For each={slides}>
            {(slide, i) => (
              <button
                class="overview-thumb"
                onClick={() => {
                  setOverview(false);
                  go(i());
                }}
              >
                <div>
                  <SlideFrame slide={slide} index={i()} thumb />
                </div>
              </button>
            )}
          </For>
        </div>
      }
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- arrow keys already drive the deck; edge clicks are a pointer shortcut on top of that */}
      <div
        class="deck-shell"
        onClick={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest("button, a")
          )
            return;
          const ratio = event.clientX / window.innerWidth;
          if (ratio > 0.72) go(index() + 1);
          if (ratio < 0.28) go(index() - 1);
        }}
      >
        <div class="controls">
          <button onClick={() => go(index() - 1)}>←</button>
          <button onClick={() => setOverview(true)}>O</button>
          <button onClick={() => setNotes((on) => !on)}>N</button>
          <button onClick={() => go(index() + 1)}>→</button>
        </div>
        <div class="slide-frame">
          <SlideFrame slide={current()} index={index()} />
        </div>
        <Show when={notes()}>
          <div class="notes-panel">{current().notes}</div>
        </Show>
      </div>
    </Show>
  );
}
