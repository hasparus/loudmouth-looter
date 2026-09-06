import { createSignal, For, onCleanup, Show, type JSX } from "solid-js";

export interface Slide {
  notes?: string;
  dark?: boolean;
  bare?: boolean;
  content: () => JSX.Element;
}

const wrap = (length: number, i: number) => ((i % length) + length) % length;

const hashIndex = (length: number) =>
  wrap(length, (Number.parseInt(location.hash.slice(1), 10) || 1) - 1);

function SlideFrame(props: {
  slide: Slide;
  index: number;
  total: number;
  series: string;
  thumb?: boolean;
}) {
  return (
    <div
      class="font-text text-neu-900 after:border-neu-500/35 [container-type:size] absolute inset-0 flex flex-col px-[6.2%] pt-[5.8%] pb-[4.8%] before:pointer-events-none before:absolute before:inset-0 before:z-0 before:bg-[radial-gradient(var(--color-neu-500)_0.5px,transparent_0.5px)] before:bg-size-[5px_5px] before:opacity-[0.14] after:pointer-events-none after:absolute after:inset-x-[3.6%] after:top-[4.25%] after:z-0 after:border-t"
      classList={{
        dark: props.slide.dark,
        "bg-neu-100 dark:bg-neu-900 dark:text-neu-100 dark:before:bg-[radial-gradient(var(--color-neu-300)_0.5px,transparent_0.5px)] dark:before:opacity-[0.08] dark:after:border-neu-400/30":
          !props.slide.bare,
        "p-0 before:hidden after:hidden": props.slide.bare,
        "bg-white": props.slide.bare && !props.slide.dark,
        "bg-neu-900": props.slide.bare && props.slide.dark,
      }}
    >
      <Show when={!props.slide.bare}>
        <div class="bg-accent-600 absolute top-[3.15%] left-[3.6%] z-1 aspect-square w-[0.9%]" />
      </Show>
      <div class="z-1 flex min-h-0 flex-1 flex-col">
        {props.slide.content()}
      </div>
      <Show when={!props.thumb && !props.slide.bare}>
        <div class="border-neu-500/35 dark:border-neu-400/30 absolute inset-x-[3.6%] bottom-[4.25%] z-1 border-t" />
        <div class="text-neu-500 dark:text-neu-400 absolute inset-x-[5.6%] bottom-[1.45%] z-1 flex items-baseline justify-between text-[clamp(7px,0.78cqw,14px)]">
          <span class="italic">{props.series}</span>
          <span class="tabular-nums">
            {String(props.index + 1).padStart(2, "0")} /{" "}
            {String(props.total).padStart(2, "0")}
          </span>
        </div>
      </Show>
    </div>
  );
}

export function Deck(props: { slides: Slide[]; series: string }) {
  const slides = () => props.slides;
  const [index, setIndex] = createSignal(hashIndex(slides().length));
  const [notes, setNotes] = createSignal(false);
  const [overview, setOverview] = createSignal(false);
  const current = () => slides()[index()]!;

  const go = (i: number) => {
    setIndex(wrap(slides().length, i));
    history.replaceState(null, "", `#${index() + 1}`);
  };

  const onHashChange = () => setIndex(hashIndex(slides().length));
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
      end: () => go(slides().length - 1),
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
        <div class="fixed inset-0 z-50 grid grid-cols-[repeat(auto-fill,320px)] justify-center gap-5 overflow-auto bg-[#0e0c0b] p-10">
          <For each={props.slides}>
            {(slide, i) => (
              <button
                class="bg-neu-100 relative h-[180px] w-[320px] cursor-pointer overflow-hidden border border-white/12 text-left"
                onClick={() => {
                  setOverview(false);
                  go(i());
                }}
              >
                <div class="pointer-events-none relative h-[900px] w-[1600px] origin-top-left scale-[0.2]">
                  <SlideFrame
                    slide={slide}
                    index={i()}
                    total={slides().length}
                    series={props.series}
                    thumb
                  />
                </div>
              </button>
            )}
          </For>
        </div>
      }
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- arrow keys already drive the deck; edge clicks are a pointer shortcut on top of that */}
      <div
        class="group grid h-dvh w-dvw place-items-center bg-[#0e0c0b] print:block print:size-auto print:bg-white"
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
        <div class="fixed top-4 right-4 z-40 flex gap-[0.35rem] opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 focus-within:opacity-100 print:hidden">
          <button
            class="bg-neu-800/80 text-neu-100 hover:bg-neu-800 cursor-pointer border border-white/15 px-[0.7rem] py-[0.45rem]"
            onClick={() => go(index() - 1)}
          >
            ←
          </button>
          <button
            class="bg-neu-800/80 text-neu-100 hover:bg-neu-800 cursor-pointer border border-white/15 px-[0.7rem] py-[0.45rem]"
            onClick={() => setOverview(true)}
          >
            O
          </button>
          <button
            class="bg-neu-800/80 text-neu-100 hover:bg-neu-800 cursor-pointer border border-white/15 px-[0.7rem] py-[0.45rem]"
            onClick={() => setNotes((on) => !on)}
          >
            N
          </button>
          <button
            class="bg-neu-800/80 text-neu-100 hover:bg-neu-800 cursor-pointer border border-white/15 px-[0.7rem] py-[0.45rem]"
            onClick={() => go(index() + 1)}
          >
            →
          </button>
        </div>
        <div class="relative isolate aspect-video h-[min(100dvh,calc(100dvw*9/16))] w-[min(100dvw,calc(100dvh*16/9))] overflow-hidden shadow-[0_24px_80px_rgb(0_0_0/0.4)] print:h-[7.5in] print:w-[13.333in] print:break-after-page print:shadow-none">
          <SlideFrame
            slide={current()}
            index={index()}
            total={slides().length}
            series={props.series}
          />
        </div>
        <Show when={notes()}>
          <div class="bg-neu-800/95 text-neu-100 fixed bottom-4 left-1/2 z-30 max-h-[36vh] w-[min(78ch,calc(100vw-2rem))] -translate-x-1/2 overflow-auto border border-white/16 p-[1rem_1.2rem] text-[14px] leading-[1.4] shadow-[0_18px_70px_rgb(0_0_0/0.5)] print:hidden">
            {current().notes}
          </div>
        </Show>
      </div>
    </Show>
  );
}
