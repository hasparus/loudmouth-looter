import { createEffect, createSignal, For, type JSX, Show } from "solid-js";

import { SLASH_COMMANDS, TrackPreview } from "./editor-atoms";

import "./editor-help-modal.css";

function Row(props: { children: JSX.Element; code: string }) {
  return (
    <div class="flex items-baseline gap-3 py-1">
      <code class="shrink-0 rounded bg-neu-100 px-1.5 py-0.5 font-mono text-xs text-neu-600 dark:bg-neu-800 dark:text-neu-300">
        {props.code}
      </code>
      <span class="flex-1 text-sm text-neu-700 dark:text-neu-300">
        {props.children}
      </span>
    </div>
  );
}

function Section(props: { children: JSX.Element; title: string }) {
  return (
    <section class="mt-5">
      <h3 class="m-0 font-serif text-xs tracking-wide text-neu-500 uppercase dark:text-neu-400">
        {props.title}
      </h3>
      <div class="mt-1">{props.children}</div>
    </section>
  );
}

// Native <dialog>: showModal() gives a real focus trap, Esc handling and
// top-layer rendering for free; the open/close animation lives in
// editor-help-modal.css. The element stays mounted so the exit transition
// can play before the browser hides it.
export function EditorHelpModal() {
  let dialogRef: HTMLDialogElement | undefined;
  let innerRef: HTMLDivElement | undefined;

  const [open, setOpen] = createSignal(false);

  createEffect(() => {
    const dialog = dialogRef;
    if (!dialog) return;
    if (open() && !dialog.open) dialog.showModal();
    else if (!open() && dialog.open) dialog.close();
  });

  const trackCommands = SLASH_COMMANDS.filter(
    (command) => command.kind === "track",
  );

  return (
    <>
      <button
        aria-expanded={open()}
        aria-haspopup="dialog"
        aria-label="Editor guide"
        class="fixed top-3 right-3 z-30 flex size-9 items-center justify-center rounded-full text-neu-500 transition-colors hover:bg-neu-200/70 hover:text-neu-800 hover:duration-0 focus-visible:text-neu-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neu-400 dark:text-neu-400 dark:hover:bg-neu-800 dark:hover:text-neu-200 dark:focus-visible:text-neu-200 print:hidden"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span aria-hidden="true" class="trim-cap-alphabetic text-lg leading-none">
          ?
        </span>
      </button>

      <dialog
        aria-label="Editor guide"
        class="te-help-dialog w-[calc(100vw-2rem)] max-w-lg rounded-xl border border-neu-200 bg-white text-neu-900 shadow-2xl dark:border-neu-700 dark:bg-neu-900 dark:text-neu-100 print:hidden"
        // The inner div covers the whole visible card; a click outside it landed
        // on the ::backdrop (or the dialog's own margin), so dismiss.
        onClick={(event) => {
          if (innerRef && !innerRef.contains(event.target as Node))
            setOpen(false);
        }}
        onClose={() => setOpen(false)}
        ref={dialogRef}
      >
        <div class="p-6" ref={innerRef}>
          <header class="flex items-start justify-between gap-4">
            <h2 class="trim-cap-alphabetic m-0 font-serif text-xl tracking-wide">
              Editor guide
            </h2>
            <button
              aria-label="Close"
              class="-mt-2 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-full text-neu-500 transition hover:bg-neu-200/70 hover:text-neu-900 dark:text-neu-400 dark:hover:bg-neu-800 dark:hover:text-neu-50"
              onClick={() => setOpen(false)}
              type="button"
            >
              <span
                aria-hidden="true"
                class="trim-end-alphabetic -translate-y-[.5px] leading-none"
              >
                ✕
              </span>
            </button>
          </header>
          <p class="font-text mt-4 text-lg text-neu-700 dark:text-neu-300">
            Type{" "}
            <code class="bg-neu-100 px-1 py-0.5 font-mono text-sm text-neu-700 dark:bg-neu-800 dark:text-neu-300">
              /
            </code>{" "}
            for the command menu. Click any square, circle or rhomb to fill it
            in.
          </p>

          <Section title="Text">
            <Row code="# ">Heading</Row>
            <Row code="## ">Subheading</Row>
            <Row code="- ">Bullet list</Row>
            <Row code="1. ">Numbered list</Row>
            <Row code="**bold**">
              Turns a word <strong>bold</strong>
            </Row>
            <Row code="_italic_">
              Turns a word <i>italic</i>
            </Row>
          </Section>

          <Section title="Checkboxes & tracks">
            <Row code="- [ ] ">
              <span class="inline-flex items-center gap-2">
                Checklist item — click to tick
                <TrackPreview count={1} shape="square" />
              </span>
            </Row>
            <For each={trackCommands}>
              {(command) => (
                <Row code={`/${command.name} ${command.defaultCount}`}>
                  <span class="inline-flex items-center gap-2">
                    {command.description}
                    <Show when={command.shape}>
                      <TrackPreview
                        count={command.defaultCount}
                        shape={command.shape!}
                      />
                    </Show>
                  </span>
                </Row>
              )}
            </For>
          </Section>

          <Section title="Marker lines">
            <Row code="/arrow">
              <p class="te-arrow m-0">A line that points to something.</p>
            </Row>
            <Row code="/chevron">
              <p class="te-chevron m-0">A quieter line, set aside.</p>
            </Row>
          </Section>
        </div>
      </dialog>
    </>
  );
}
