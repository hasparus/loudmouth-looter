import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";

import { buildTrackElement, type SlashCommand } from "./editor-atoms";
import {
  applyInlineTransform,
  applyTaskShorthand,
  captureSnapshot,
  DEFAULT_HTML,
  flushSave,
  focusSiblingToggle,
  getCurrentBlock,
  handleEditorPaste,
  handleEnter,
  matchSlashCommands,
  migrateStorage,
  normalizeEmptyBlocks,
  normalizeTrackTabindexes,
  readSlashState,
  restoreSelection,
  save,
  serializeDocument,
  SLASH_MENU_ID,
  SLASH_QUERY,
  slashOptionId,
  type SlashState,
  SPELLCHECK_KEY,
  STORAGE_KEY,
  trackBeforeCaret,
  type UndoSnapshot,
} from "./editor-dom";
import { EditorHelpModal } from "./editor-help-modal";
import { sanitizeHtml } from "./editor-sanitize";
import { SlashMenu } from "./slash-menu";
import styles from "./text-editor.module.css";
import { useLinkedFile } from "./use-linked-file";

import "./editor-atoms.css";

// Keeps a track's roving tabindex on whichever toggle focus last reached.
function handleFocus(event: FocusEvent) {
  const toggle = (event.target as HTMLElement).closest(".te-toggle");
  if (!(toggle instanceof HTMLElement)) return;
  const track = toggle.closest(".te-track");
  if (!track) return;
  for (const sibling of track.querySelectorAll<HTMLElement>(".te-toggle")) {
    sibling.tabIndex = sibling === toggle ? 0 : -1;
  }
}

// Mouse-down on a toggle would normally pull focus onto the button and wipe
// the caret. Stop the default so a click toggles without uprooting the writer;
// keyboard focus still works because it never goes via mousedown.
function handleMouseDown(event: MouseEvent) {
  const toggle = (event.target as HTMLElement).closest(".te-toggle");
  if (toggle) event.preventDefault();
}

export function TextEditor() {
  let editorEl: HTMLDivElement | undefined;
  // One-slot custom undo: the editor's transforms (slash commands, `- [ ] `,
  // headings, lists) bypass the browser's history, so Ctrl/Cmd+Z restores
  // this pre-transform snapshot. Cleared once the writer types past it.
  let pendingUndo: UndoSnapshot | null = null;
  const [spellcheck, setSpellcheck] = createSignal(
    localStorage.getItem(SPELLCHECK_KEY) !== "false",
  );
  const [slash, setSlash] = createSignal<SlashState | null>(null);
  const [slashIndex, setSlashIndex] = createSignal(0);
  const file = useLinkedFile();

  function persist(editor: HTMLElement) {
    save(editor);
    file.queue(serializeDocument(editor));
  }
  function persistNow(editor: HTMLElement) {
    flushSave(editor);
    void file.flushWrite(serializeDocument(editor));
  }

  // Recomputes the pending `/command` query after any caret-moving event.
  function refreshSlash() {
    const editor = editorEl;
    if (!editor) return;
    const next = readSlashState(editor);
    setSlash(next && matchSlashCommands(next).length > 0 ? next : null);
    setSlashIndex(0);
  }

  function undoTransform(editor: HTMLElement) {
    const snapshot = pendingUndo;
    if (!snapshot) return;
    editor.innerHTML = snapshot.html;
    normalizeTrackTabindexes(editor);
    restoreSelection(editor, snapshot.selection);
    pendingUndo = null;
    setSlash(null);
    persistNow(editor);
  }

  // Replaces the typed `/command` query with its rendered atom.
  function commitSlash(command: SlashCommand, count: number | null) {
    const editor = editorEl;
    if (!editor) return;

    const selection = globalThis.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setSlash(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (!(node instanceof Text)) {
      setSlash(null);
      return;
    }

    const localMatch = node.data.slice(0, range.startOffset).match(SLASH_QUERY);
    if (!localMatch) {
      setSlash(null);
      return;
    }

    const snapshot = captureSnapshot(editor);

    const deleteRange = document.createRange();
    deleteRange.setStart(node, range.startOffset - localMatch[0].length);
    deleteRange.setEnd(node, range.startOffset);
    deleteRange.deleteContents();

    if (command.kind === "track" && command.shape) {
      // deleteRange is collapsed at the deletion point; insert the atom and a
      // trailing space there as one fragment, then drop the caret past both.
      const track = buildTrackElement(
        command.shape,
        count ?? command.defaultCount,
      );
      // Non-breaking space: a plain trailing space next to an inline atom gets
      // collapsed away by contentEditable whitespace normalisation.
      const space = document.createTextNode(" ");
      const fragment = document.createDocumentFragment();
      fragment.append(track, space);
      deleteRange.insertNode(fragment);

      const caret = document.createRange();
      caret.setStartAfter(space);
      caret.collapse(true);
      selection.removeAllRanges();
      selection.addRange(caret);
    } else if (command.blockClass) {
      const block = getCurrentBlock(editor);
      if (block && block.tagName === "P") {
        // Replace the line kind rather than stacking marker classes.
        block.classList.remove("te-arrow", "te-chevron");
        block.classList.add(command.blockClass);
      }
    }

    pendingUndo = snapshot;
    setSlash(null);
    setSlashIndex(0);
    normalizeEmptyBlocks(editor);
    persistNow(editor);
  }

  onMount(() => {
    const editor = editorEl;
    if (!editor) return;

    migrateStorage();
    editor.innerHTML = sanitizeHtml(
      localStorage.getItem(STORAGE_KEY) || DEFAULT_HTML,
    );
    normalizeTrackTabindexes(editor);

    const handleBeforeUnload = () => flushSave(editor);
    globalThis.addEventListener("beforeunload", handleBeforeUnload);
    onCleanup(() =>
      globalThis.removeEventListener("beforeunload", handleBeforeUnload),
    );
  });

  // A caret move that fires no `input` event (arrow keys, clicks) still has to
  // refresh the slash menu, otherwise it lingers stale at the old anchor.
  onMount(() => {
    let scheduled = 0;
    const handler = () => {
      if (scheduled) return;
      scheduled = requestAnimationFrame(() => {
        scheduled = 0;
        const editor = editorEl;
        const anchor = globalThis.getSelection()?.anchorNode ?? null;
        if (editor && anchor && editor.contains(anchor)) refreshSlash();
      });
    };
    document.addEventListener("selectionchange", handler);
    onCleanup(() => {
      document.removeEventListener("selectionchange", handler);
      if (scheduled) cancelAnimationFrame(scheduled);
    });
  });

  createEffect(() => {
    localStorage.setItem(SPELLCHECK_KEY, String(spellcheck()));
  });

  async function handleOpenFile() {
    const editor = editorEl;
    if (!editor) return;
    const html = await file.open();
    if (html === null) return;
    editor.innerHTML = sanitizeHtml(html);
    normalizeTrackTabindexes(editor);
    setSlash(null);
    pendingUndo = null;
    flushSave(editor);
  }

  async function handleSaveFile() {
    const editor = editorEl;
    if (editor) await file.save(serializeDocument(editor));
  }

  async function handleCloseFile() {
    const editor = editorEl;
    await file.close(editor ? serializeDocument(editor) : undefined);
  }

  const slashCommands = () => {
    const current = slash();
    return current ? matchSlashCommands(current) : [];
  };
  const slashActiveId = () => {
    const commands = slashCommands();
    return commands.length > 0
      ? slashOptionId(
          commands[Math.min(slashIndex(), commands.length - 1)].name,
        )
      : undefined;
  };

  function handleBlur() {
    const editor = editorEl;
    if (editor) persistNow(editor);
    setSlash(null);
  }

  // A click — or keyboard Space/Enter on a focused toggle — flips its state;
  // any click also refreshes the slash menu against the moved caret.
  function handleClick(event: MouseEvent) {
    const editor = editorEl;
    if (!editor) return;
    const toggle = (event.target as HTMLElement).closest(".te-toggle");
    if (toggle instanceof HTMLElement && editor.contains(toggle)) {
      const checked = toggle.getAttribute("aria-checked") === "true";
      toggle.setAttribute("aria-checked", checked ? "false" : "true");
      persistNow(editor);
    }
    refreshSlash();
  }

  function handleInput(event: InputEvent) {
    const editor = editorEl;
    if (!editor) return;
    if (event.isComposing) return;
    applyInlineTransform(editor);
    // A task transform stores its undo snapshot; plain typing (null) clears
    // any pending one — the writer has moved past it.
    pendingUndo = applyTaskShorthand(editor);
    normalizeEmptyBlocks(editor);
    refreshSlash();
    persist(editor);
  }

  function handlePaste(event: ClipboardEvent) {
    const editor = editorEl;
    if (!editor) return;
    event.preventDefault();
    pendingUndo = null;
    if (event.clipboardData) handleEditorPaste(editor, event.clipboardData);
  }

  // Slash-menu keys while the menu is open. Returns true once handled.
  function handleSlashKey(event: KeyboardEvent): boolean {
    const current = slash();
    if (!current) return false;
    const matches = matchSlashCommands(current);
    if (matches.length === 0) return false;
    const selected = matches[Math.min(slashIndex(), matches.length - 1)];

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSlashIndex((index) => (index + 1) % matches.length);
      return true;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSlashIndex((index) => (index - 1 + matches.length) % matches.length);
      return true;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setSlash(null);
      return true;
    }
    // Tab dismisses the menu and is left to move focus normally.
    if (event.key === "Tab") {
      setSlash(null);
      return true;
    }
    // A track command needs its count before it can be committed; until then,
    // let Space through so the number can be typed.
    const ready = selected.kind === "block" || current.count !== null;
    if (event.key === "Enter" || (event.key === " " && ready)) {
      event.preventDefault();
      commitSlash(selected, current.count);
      return true;
    }
    return false;
  }

  function handleKeyDown(event: KeyboardEvent) {
    const editor = editorEl;
    if (!editor) return;

    if ((event.metaKey || event.ctrlKey) && file.supported) {
      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        void file.save(serializeDocument(editor));
        return;
      }
      if (key === "o") {
        event.preventDefault();
        void (async () => {
          if (file.name !== null) {
            const closed = await file.close(serializeDocument(editor));
            if (!closed) return;
          }
          await handleOpenFile();
        })();
        return;
      }
    }

    // Ctrl/Cmd+Z reverts the most recent editor transform.
    if (
      (event.metaKey || event.ctrlKey) &&
      !event.shiftKey &&
      event.key.toLowerCase() === "z" &&
      pendingUndo
    ) {
      event.preventDefault();
      undoTransform(editor);
      return;
    }

    // Keys on a focused toggle: arrows rove within the track, the rest
    // (Space, Enter, Tab) are left to the native button.
    const onToggle = (event.target as HTMLElement).closest(".te-toggle");
    if (onToggle) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        focusSiblingToggle(onToggle, event.key);
      }
      return;
    }

    if (handleSlashKey(event)) return;

    // Backspace just before a track peels off its last toggle rather than
    // deleting the whole atom. The final toggle falls through to the default
    // (which removes the now-empty track).
    if (event.key === "Backspace") {
      const track = trackBeforeCaret(editor);
      const toggles = track ? [...track.querySelectorAll(".te-toggle")] : [];
      const last = toggles.at(-1);
      if (last && toggles.length > 1) {
        event.preventDefault();
        last.remove();
        persistNow(editor);
        return;
      }
    }

    if (event.key === "Enter") {
      const snapshot = captureSnapshot(editor);
      if (handleEnter(editor)) {
        event.preventDefault();
        normalizeEmptyBlocks(editor);
        pendingUndo = snapshot;
        persistNow(editor);
      }
    }
  }

  const controlButton =
    "flex font-mono text-xs items-center justify-center px-1 py-0.5 text-neu-500 transition hover:duration-0 hover:bg-neu-200/70 hover:text-neu-900 dark:text-neu-400 dark:hover:bg-neu-800 dark:hover:text-neu-50";

  return (
    <main class="min-h-screen">
      <div class="mx-auto max-w-3xl px-4 py-24 md:px-6 print:max-w-none print:px-0 print:py-0">
        <div
          aria-activedescendant={slash() ? slashActiveId() : undefined}
          aria-controls={slash() ? SLASH_MENU_ID : undefined}
          aria-label="Editor"
          autocapitalize={spellcheck() ? "sentences" : "off"}
          autocorrect={spellcheck() ? "on" : "off"}
          class={`${styles.editor} min-h-[75vh] w-full border-0 bg-transparent text-[1.22rem] leading-normal outline-none print:min-h-0 print:text-black`}
          contenteditable
          tabindex={0}
          onBlur={handleBlur}
          onClick={handleClick}
          onFocus={handleFocus}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onMouseDown={handleMouseDown}
          onPaste={handlePaste}
          ref={editorEl}
          role="textbox"
          spellcheck={spellcheck()}
        />
      </div>

      <EditorHelpModal />

      <Show when={slash()}>
        {(current) => (
          <SlashMenu
            activeId={slashActiveId()}
            anchor={current().anchor}
            commands={slashCommands()}
            count={current().count}
            id={SLASH_MENU_ID}
            index={slashIndex()}
            onPick={(command) => commitSlash(command, current().count)}
            optionId={slashOptionId}
          />
        )}
      </Show>

      <footer class="mt-auto flex items-center justify-between gap-2 px-4 pb-5 print:hidden">
        <div class="text-neu-500 dark:text-neu-400 flex min-w-0 items-center gap-1 font-mono text-xs">
          <Show when={file.supported}>
            <Show
              when={file.name === null}
              fallback={
                <>
                  <button
                    class={controlButton}
                    onClick={() => void handleSaveFile()}
                    type="button"
                  >
                    [save]
                  </button>
                  <button
                    class={controlButton}
                    onClick={() => void handleCloseFile()}
                    type="button"
                  >
                    [close]
                  </button>
                  <span class="truncate px-1" title={file.name ?? undefined}>
                    {file.name}
                    {file.status === "saved" && " · saved"}
                    {file.status === "saving" && " · saving…"}
                    {file.status === "error" && " · save failed"}
                  </span>
                </>
              }
            >
              <button
                class={controlButton}
                onClick={() => void handleOpenFile()}
                type="button"
              >
                [open]
              </button>
              <button
                class={controlButton}
                onClick={() => void handleSaveFile()}
                type="button"
              >
                [save]
              </button>
            </Show>
          </Show>
        </div>
        <button
          aria-label={
            spellcheck() ? "Turn spellcheck off" : "Turn spellcheck on"
          }
          class={controlButton}
          onClick={() => setSpellcheck((value) => !value)}
          type="button"
        >
          [spellcheck {spellcheck() ? "on" : "off"}]
        </button>
      </footer>
    </main>
  );
}
