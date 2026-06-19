/** @jsxImportSource react */
import {
  type ClipboardEvent,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";

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
  sanitizeHtml,
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
import { SlashMenu } from "./slash-menu";
import styles from "./text-editor.module.css";
import { useLinkedFile } from "./use-linked-file";

import "./editor-atoms.css";

// Keeps a track's roving tabindex on whichever toggle focus last reached.
function handleFocus(event: FocusEvent<HTMLDivElement>) {
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
function handleMouseDown(event: MouseEvent<HTMLDivElement>) {
  const toggle = (event.target as HTMLElement).closest(".te-toggle");
  if (toggle) event.preventDefault();
}

export function TextEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  // One-slot custom undo: the editor's transforms (slash commands, `- [ ] `,
  // headings, lists) bypass the browser's history, so Ctrl/Cmd+Z restores
  // this pre-transform snapshot. Cleared once the writer types past it.
  const pendingUndo = useRef<UndoSnapshot | null>(null);
  const [spellcheck, setSpellcheck] = useState(() => {
    const saved = localStorage.getItem(SPELLCHECK_KEY);
    return saved === null ? true : saved === "true";
  });
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
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
    const editor = editorRef.current;
    if (!editor) return;
    const next = readSlashState(editor);
    setSlash(next && matchSlashCommands(next).length > 0 ? next : null);
    setSlashIndex(0);
  }

  function undoTransform(editor: HTMLElement) {
    const snapshot = pendingUndo.current;
    if (!snapshot) return;
    editor.innerHTML = snapshot.html;
    normalizeTrackTabindexes(editor);
    restoreSelection(editor, snapshot.selection);
    pendingUndo.current = null;
    setSlash(null);
    persistNow(editor);
  }

  // Replaces the typed `/command` query with its rendered atom.
  function commitSlash(command: SlashCommand, count: number | null) {
    const editor = editorRef.current;
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
      const space = document.createTextNode(" ");
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

    pendingUndo.current = snapshot;
    setSlash(null);
    setSlashIndex(0);
    normalizeEmptyBlocks(editor);
    persistNow(editor);
  }

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    migrateStorage();
    editor.innerHTML = sanitizeHtml(
      localStorage.getItem(STORAGE_KEY) || DEFAULT_HTML,
    );
    normalizeTrackTabindexes(editor);

    const handleBeforeUnload = () => flushSave(editor);
    globalThis.addEventListener("beforeunload", handleBeforeUnload);
    return () =>
      globalThis.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // A caret move that fires no `input` event (arrow keys, clicks) still has to
  // refresh the slash menu, otherwise it lingers stale at the old anchor.
  useEffect(() => {
    let scheduled = 0;
    const handler = () => {
      if (scheduled) return;
      scheduled = requestAnimationFrame(() => {
        scheduled = 0;
        const editor = editorRef.current;
        const anchor = globalThis.getSelection()?.anchorNode ?? null;
        if (editor && anchor && editor.contains(anchor)) refreshSlash();
      });
    };
    document.addEventListener("selectionchange", handler);
    return () => {
      document.removeEventListener("selectionchange", handler);
      if (scheduled) cancelAnimationFrame(scheduled);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(SPELLCHECK_KEY, String(spellcheck));
  }, [spellcheck]);

  async function handleOpenFile() {
    const editor = editorRef.current;
    if (!editor) return;
    const html = await file.open();
    if (html === null) return;
    editor.innerHTML = sanitizeHtml(html);
    normalizeTrackTabindexes(editor);
    setSlash(null);
    pendingUndo.current = null;
    flushSave(editor);
  }

  async function handleSaveFile() {
    const editor = editorRef.current;
    if (editor) await file.save(serializeDocument(editor));
  }

  async function handleCloseFile() {
    const editor = editorRef.current;
    await file.close(editor ? serializeDocument(editor) : undefined);
  }

  const slashCommands = slash ? matchSlashCommands(slash) : [];
  const slashActiveId =
    slashCommands.length > 0
      ? slashOptionId(
          slashCommands[Math.min(slashIndex, slashCommands.length - 1)].name,
        )
      : undefined;

  function handleBlur() {
    const editor = editorRef.current;
    if (editor) persistNow(editor);
    setSlash(null);
  }

  // A click — or keyboard Space/Enter on a focused toggle — flips its state;
  // any click also refreshes the slash menu against the moved caret.
  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const editor = editorRef.current;
    if (!editor) return;
    const toggle = (event.target as HTMLElement).closest(".te-toggle");
    if (toggle instanceof HTMLElement && editor.contains(toggle)) {
      const checked = toggle.getAttribute("aria-checked") === "true";
      toggle.setAttribute("aria-checked", checked ? "false" : "true");
      persistNow(editor);
    }
    refreshSlash();
  }

  function handleInput(event: FormEvent<HTMLDivElement>) {
    const editor = editorRef.current;
    if (!editor) return;
    if ((event.nativeEvent as InputEvent).isComposing) return;
    applyInlineTransform(editor);
    // A task transform stores its undo snapshot; plain typing (null) clears
    // any pending one — the writer has moved past it.
    pendingUndo.current = applyTaskShorthand(editor);
    normalizeEmptyBlocks(editor);
    refreshSlash();
    persist(editor);
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const editor = editorRef.current;
    if (!editor) return;
    event.preventDefault();
    pendingUndo.current = null;
    handleEditorPaste(editor, event.clipboardData);
  }

  // Slash-menu keys while the menu is open. Returns true once handled.
  function handleSlashKey(event: KeyboardEvent<HTMLDivElement>): boolean {
    if (!slash) return false;
    const matches = matchSlashCommands(slash);
    if (matches.length === 0) return false;
    const selected = matches[Math.min(slashIndex, matches.length - 1)];

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
    const ready = selected.kind === "block" || slash.count !== null;
    if (event.key === "Enter" || (event.key === " " && ready)) {
      event.preventDefault();
      commitSlash(selected, slash.count);
      return true;
    }
    return false;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const editor = editorRef.current;
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
      pendingUndo.current
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
        pendingUndo.current = snapshot;
        persistNow(editor);
      }
    }
  }

  const controlButton =
    "flex font-mono text-xs items-center justify-center px-1 py-0.5 text-stone-500 transition hover:duration-0 hover:bg-stone-200/70 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-50";

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-24 md:px-6 print:max-w-none print:px-0 print:py-0">
        <div
          aria-activedescendant={slash ? slashActiveId : undefined}
          aria-controls={slash ? SLASH_MENU_ID : undefined}
          aria-label="Editor"
          autoCapitalize={spellcheck ? "sentences" : "off"}
          autoCorrect={spellcheck ? "on" : "off"}
          className={`${styles.editor} min-h-[75vh] w-full border-0 bg-transparent text-[1.22rem] leading-normal outline-none print:min-h-0 print:text-black`}
          contentEditable
          tabIndex={0}
          onBlur={handleBlur}
          onClick={handleClick}
          onFocus={handleFocus}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onMouseDown={handleMouseDown}
          onPaste={handlePaste}
          ref={editorRef}
          role="textbox"
          spellCheck={spellcheck}
          suppressContentEditableWarning
        />
      </div>

      <EditorHelpModal />

      {slash && (
        <SlashMenu
          activeId={slashActiveId}
          anchor={slash.anchor}
          commands={slashCommands}
          count={slash.count}
          id={SLASH_MENU_ID}
          index={slashIndex}
          onPick={(command) => commitSlash(command, slash.count)}
          optionId={slashOptionId}
        />
      )}

      <footer className="mt-auto flex items-center justify-between gap-2 px-4 pb-5 print:hidden">
        <div className="flex min-w-0 items-center gap-1 font-mono text-xs text-stone-500 dark:text-stone-400">
          {file.supported &&
            (file.name === null ? (
              <>
                <button
                  className={controlButton}
                  onClick={() => void handleOpenFile()}
                  type="button"
                >
                  [open]
                </button>
                <button
                  className={controlButton}
                  onClick={() => void handleSaveFile()}
                  type="button"
                >
                  [save]
                </button>
              </>
            ) : (
              <>
                <button
                  className={controlButton}
                  onClick={() => void handleSaveFile()}
                  type="button"
                >
                  [save]
                </button>
                <button
                  className={controlButton}
                  onClick={() => void handleCloseFile()}
                  type="button"
                >
                  [close]
                </button>
                <span className="truncate px-1" title={file.name}>
                  {file.name}
                  {file.status === "saved" && " · saved"}
                  {file.status === "saving" && " · saving…"}
                  {file.status === "error" && " · save failed"}
                </span>
              </>
            ))}
        </div>
        <button
          aria-label={spellcheck ? "Turn spellcheck off" : "Turn spellcheck on"}
          className={controlButton}
          onClick={() => setSpellcheck((value) => !value)}
          type="button"
        >
          [spellcheck {spellcheck ? "on" : "off"}]
        </button>
      </footer>
    </main>
  );
}
