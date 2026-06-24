import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
} from "solid-js";

import { ControlButton } from "./ControlButton";
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
  syncDocumentTitle,
  trackBeforeCaret,
  type UndoSnapshot,
} from "./editor-dom";
import { EditorHelpModal } from "./editor-help-modal";
import { sanitizeHtml } from "./editor-sanitize";
import { buildMoveElement } from "./move-dom";
import { SlashMenu } from "./slash-menu";
import styles from "./text-editor.module.css";
import { useLinkedFile } from "./use-linked-file";

import "./editor-atoms.css";

function handleFocus(event: FocusEvent) {
  const toggle = (event.target as HTMLElement).closest(".te-toggle");
  if (!(toggle instanceof HTMLElement)) return;
  const track = toggle.closest(".te-track");
  if (!track) return;
  for (const sibling of track.querySelectorAll<HTMLElement>(".te-toggle")) {
    sibling.tabIndex = sibling === toggle ? 0 : -1;
  }
}

function handleMouseDown(event: MouseEvent) {
  const toggle = (event.target as HTMLElement).closest(".te-toggle");
  if (toggle) event.preventDefault();
}

export function TextEditor() {
  let editorEl: HTMLDivElement | undefined;
  let pendingUndo: UndoSnapshot | null = null;
  const [spellcheck, setSpellcheck] = createSignal(
    localStorage.getItem(SPELLCHECK_KEY) !== "false",
  );
  const [slash, setSlash] = createSignal<SlashState | null>(null);
  const [slashIndex, setSlashIndex] = createSignal(0);
  const file = useLinkedFile();

  function persist(editor: HTMLElement) {
    save(editor);
    syncDocumentTitle(editor);
    file.queue(serializeDocument(editor));
  }
  function persistNow(editor: HTMLElement) {
    flushSave(editor);
    syncDocumentTitle(editor);
    void file.flushWrite(serializeDocument(editor));
  }

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
      const track = buildTrackElement(
        command.shape,
        count ?? command.defaultCount,
      );
      const space = document.createTextNode(" ");
      const fragment = document.createDocumentFragment();
      fragment.append(track, space);
      deleteRange.insertNode(fragment);

      const caret = document.createRange();
      caret.setStartAfter(space);
      caret.collapse(true);
      selection.removeAllRanges();
      selection.addRange(caret);
    } else if (command.name === "move") {
      const body = document.createElement("p");
      body.innerHTML = "<br>";
      const move = buildMoveElement("New Move", undefined, [body]);
      const block = getCurrentBlock(editor);
      if (block) block.replaceWith(move);
      else deleteRange.insertNode(move);

      const title = move.querySelector("h3");
      const caret = document.createRange();
      if (title) caret.selectNodeContents(title);
      else {
        caret.selectNodeContents(body);
        caret.collapse(true);
      }
      selection.removeAllRanges();
      selection.addRange(caret);
    } else if (command.blockClass) {
      const block = getCurrentBlock(editor);
      if (block && block.tagName === "P") {
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
    syncDocumentTitle(editor);

    const handleBeforeUnload = () => flushSave(editor);
    globalThis.addEventListener("beforeunload", handleBeforeUnload);
    onCleanup(() =>
      globalThis.removeEventListener("beforeunload", handleBeforeUnload),
    );
  });

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
    syncDocumentTitle(editor);
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

  const slashCommands = createMemo(() => {
    const current = slash();
    return current ? matchSlashCommands(current) : [];
  });
  const slashActiveId = createMemo(() => {
    const commands = slashCommands();
    const command = commands[Math.min(slashIndex(), commands.length - 1)];
    return command ? slashOptionId(command.name) : undefined;
  });

  function handleBlur() {
    const editor = editorEl;
    if (editor) persistNow(editor);
    setSlash(null);
  }

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
    syncDocumentTitle(editor);
    persist(editor);
  }

  function handleSlashKey(event: KeyboardEvent): boolean {
    const current = slash();
    if (!current) return false;
    const matches = matchSlashCommands(current);
    if (matches.length === 0) return false;
    const selected = matches[Math.min(slashIndex(), matches.length - 1)];
    if (!selected) return false;

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
    if (event.key === "Tab") {
      setSlash(null);
      return true;
    }
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

    const onToggle = (event.target as HTMLElement).closest(".te-toggle");
    if (onToggle) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        focusSiblingToggle(onToggle, event.key);
      }
      return;
    }

    if (handleSlashKey(event)) return;

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
                  <ControlButton onClick={() => void handleSaveFile()}>
                    [save]
                  </ControlButton>
                  <ControlButton onClick={() => void handleCloseFile()}>
                    [close]
                  </ControlButton>
                  <span class="truncate px-1" title={file.name ?? undefined}>
                    {file.name}
                    {file.status === "saved" && " · saved"}
                    {file.status === "saving" && " · saving…"}
                    {file.status === "error" && " · save failed"}
                  </span>
                </>
              }
            >
              <ControlButton onClick={() => void handleOpenFile()}>
                [open]
              </ControlButton>
              <ControlButton onClick={() => void handleSaveFile()}>
                [save]
              </ControlButton>
            </Show>
          </Show>
        </div>
        <ControlButton
          aria-label={
            spellcheck() ? "Turn spellcheck off" : "Turn spellcheck on"
          }
          onClick={() => setSpellcheck((value) => !value)}
        >
          [spellcheck {spellcheck() ? "on" : "off"}]
        </ControlButton>
      </footer>
    </main>
  );
}
