import { createEffect, createSignal, For, type JSX, Show } from "solid-js";

import { SLASH_COMMANDS, TrackPreview } from "./editor-atoms";

import "./editor-help-modal.css";

function Row(props: { children: JSX.Element; code: string }) {
  return (
    <div class="flex items-baseline gap-3 py-1">
      <code class="bg-neu-100 text-neu-600 dark:bg-neu-800 dark:text-neu-300 shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-xs">
        {props.code}
      </code>
      <span class="text-neu-800 dark:text-neu-300 flex-1 text-sm">
        {props.children}
      </span>
    </div>
  );
}

function Section(props: { children: JSX.Element; title: string }) {
  return (
    <section class="mt-5">
      <h3 class="text-neu-500 dark:text-neu-400 m-0 font-serif text-xs tracking-wide uppercase">
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
        class="text-neu-500 hover:bg-neu-200/70 hover:text-neu-800 focus-visible:text-neu-800 focus-visible:outline-neu-400 dark:text-neu-400 dark:hover:bg-neu-800 dark:hover:text-neu-200 dark:focus-visible:text-neu-200 fixed top-3 right-3 z-30 flex size-9 items-center justify-center rounded-full transition-colors hover:duration-0 focus-visible:outline-2 focus-visible:outline-offset-2 print:hidden"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span
          aria-hidden="true"
          class="trim-cap-alphabetic text-lg leading-none"
        >
          ?
        </span>
      </button>

      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- native <dialog> already closes on Esc; onClick only adds backdrop-click dismissal */}
      <dialog
        aria-label="Editor guide"
        class="te-help-dialog border-neu-200 text-neu-900 dark:border-neu-700 dark:bg-neu-900 dark:text-neu-100 w-[calc(100vw-2rem)] max-w-lg rounded-xl border bg-white shadow-2xl print:hidden"
        // The inner div covers the whole visible card; a click outside it landed
        // on the ::backdrop (or the dialog's own margin), so dismiss.
        onClick={(event) => {
          if (innerRef && !innerRef.contains(event.target)) setOpen(false);
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
              class="text-neu-500 hover:bg-neu-200/70 hover:text-neu-900 dark:text-neu-400 dark:hover:bg-neu-800 dark:hover:text-neu-50 -mt-2 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-full transition"
              onClick={() => setOpen(false)}
              type="button"
            >
              <span
                aria-hidden="true"
                class="trim-end-alphabetic translate-y-[-0.5px] leading-none"
              >
                ✕
              </span>
            </button>
          </header>
          <p class="font-text text-neu-800 dark:text-neu-300 mt-4 text-lg">
            Type{" "}
            <code class="bg-neu-100 text-neu-800 dark:bg-neu-800 dark:text-neu-300 px-1 py-0.5 font-mono text-sm">
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
