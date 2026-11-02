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
import { literalContextAt, pasteLiteral } from "./editor-code-block";
import {
  applyDashes,
  commandForKey,
  type EditorCommand,
  isKeyRule,
  runCommand,
} from "./editor-commands";
import {
  applyTaskShorthand,
  captureSnapshot,
  countWords,
  DEFAULT_HTML,
  flushSave,
  focusSiblingToggle,
  matchSlashCommands,
  migrateStorage,
  normalizeEmptyBlocks,
  normalizeTrackTabindexes,
  readSlashState,
  save,
  serializeDocument,
  SLASH_MENU_ID,
  SLASH_QUERY,
  slashOptionId,
  type SlashState,
  SPELLCHECK_KEY,
  STORAGE_KEY,
  syncDocumentTitle,
  type UndoSnapshot,
  updateSnapshotImage,
} from "./editor-dom";
import { EditorHelpModal } from "./editor-help-modal";
import { applyInlineTransform } from "./editor-inline";
import { handleEditorPaste } from "./editor-paste";
import { sanitizeHtml } from "./editor-sanitize";
import { restoreSelection, select } from "./editor-selection";
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

type Caret = readonly [Node | null, number, Node | null, number];

function caretOf(selection: Selection | null): Caret {
  return [
    selection?.anchorNode ?? null,
    selection?.anchorOffset ?? 0,
    selection?.focusNode ?? null,
    selection?.focusOffset ?? 0,
  ];
}

const WORD_COUNT_DELAY_MS = 300;

export function TextEditor() {
  let editorEl: HTMLDivElement | undefined;
  let pendingUndo: UndoSnapshot | null = null;
  let slashCaret: Caret = [null, 0, null, 0];
  let wordTimer: ReturnType<typeof setTimeout> | undefined;
  const [spellcheck, setSpellcheck] = createSignal(
    localStorage.getItem(SPELLCHECK_KEY) !== "false",
  );
  const [slash, setSlash] = createSignal<SlashState | null>(null);
  const [slashIndex, setSlashIndex] = createSignal(0);
  const [words, setWords] = createSignal(0);
  const file = useLinkedFile();
  onCleanup(() => clearTimeout(wordTimer));

  // Every change to the document ends here: storage, linked file, title and
  // word count. `now` writes immediately; typing is debounced.
  function afterChange(editor: HTMLElement, now: boolean) {
    syncDocumentTitle(editor);
    clearTimeout(wordTimer);
    if (now) {
      flushSave(editor);
      setWords(countWords(editor));
      void file.flushWrite(serializeDocument(editor));
    } else {
      save(editor);
      wordTimer = setTimeout(
        () => setWords(countWords(editor)),
        WORD_COUNT_DELAY_MS,
      );
      file.queue(serializeDocument(editor));
    }
  }

  function loadDocument(editor: HTMLElement, html: string) {
    editor.innerHTML = sanitizeHtml(html);
    normalizeTrackTabindexes(editor);
    normalizeEmptyBlocks(editor);
    syncDocumentTitle(editor);
    setWords(countWords(editor));
    setSlash(null);
    pendingUndo = null;
  }

  // Runs one edit as one undo step: snapshot, mutate, tidy, save. Native
  // browser commands keep to the browser's own undo stack.
  function applyEdit(
    editor: HTMLElement,
    edit: () => boolean,
    undoable = true,
  ): boolean {
    const snapshot = captureSnapshot(editor);
    if (!edit()) return false;
    pendingUndo = undoable ? snapshot : null;
    normalizeEmptyBlocks(editor);
    setSlash(null);
    afterChange(editor, true);
    return true;
  }

  function refreshSlash() {
    const editor = editorEl;
    if (!editor) return;
    slashCaret = caretOf(globalThis.getSelection());
    const next = literalContextAt(editor) ? null : readSlashState(editor);
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
    afterChange(editor, true);
  }

  function insertTrack(
    range: Range,
    command: SlashCommand,
    count: number | null,
  ) {
    if (command.kind !== "track") return;
    const track = buildTrackElement(
      command.shape,
      count ?? command.defaultCount,
    );
    const space = document.createTextNode(" ");
    range.insertNode(space);
    range.insertNode(track);
    range.setStartAfter(space);
    range.collapse(true);
    select(range);
  }

  function commitSlash(command: SlashCommand, count: number | null) {
    const editor = editorEl;
    const selection = globalThis.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const node = range?.startContainer;
    const query =
      node instanceof Text
        ? SLASH_QUERY.exec(node.data.slice(0, range?.startOffset))
        : null;
    if (!editor || !range || !node || !query) {
      setSlash(null);
      return;
    }

    applyEdit(editor, () => {
      range.setStart(node, range.startOffset - query[0].length);
      range.deleteContents();
      if (command.kind === "track") insertTrack(range, command, count);
      else runCommand(editor, command.command);
      return true;
    });
    setSlashIndex(0);
  }

  onMount(() => {
    const editor = editorEl;
    if (!editor) return;

    migrateStorage();
    loadDocument(editor, localStorage.getItem(STORAGE_KEY) || DEFAULT_HTML);

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
        const selection = globalThis.getSelection();
        const anchor = selection?.anchorNode ?? null;
        const moved = caretOf(selection).some(
          (value, index) => value !== slashCaret[index],
        );
        if (editor && anchor && editor.contains(anchor) && moved)
          refreshSlash();
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
    loadDocument(editor, html);
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
    if (editor) afterChange(editor, true);
    setSlash(null);
  }

  function handleClick(event: MouseEvent) {
    const editor = editorEl;
    if (!editor) return;
    const toggle = (event.target as HTMLElement).closest(".te-toggle");
    if (toggle instanceof HTMLElement && editor.contains(toggle)) {
      const checked = toggle.getAttribute("aria-checked") === "true";
      toggle.setAttribute("aria-checked", checked ? "false" : "true");
      afterChange(editor, true);
    }
    refreshSlash();
  }

  function handleInput(event: InputEvent) {
    const editor = editorEl;
    if (!editor) return;
    if (event.isComposing) return;
    let autocorrected: UndoSnapshot | null = null;
    // Code is literal: no inline Markdown, no dashes.
    if (!literalContextAt(editor)) {
      if (event.inputType === "insertText" && event.data === "-") {
        const snapshot = captureSnapshot(editor);
        if (applyDashes(editor)) autocorrected = snapshot;
      }
      applyInlineTransform(editor);
    }
    pendingUndo = applyTaskShorthand(editor) ?? autocorrected;
    normalizeEmptyBlocks(editor);
    refreshSlash();
    afterChange(editor, false);
  }

  function handlePaste(event: ClipboardEvent) {
    const editor = editorEl;
    if (!editor) return;
    event.preventDefault();
    pendingUndo = null;
    if (!event.clipboardData) return;
    const literal = literalContextAt(editor);
    if (literal) {
      if (pasteLiteral(editor, literal, event.clipboardData))
        afterChange(editor, true);
      return;
    }
    handleEditorPaste(editor, event.clipboardData, (image) => {
      if (image && pendingUndo)
        pendingUndo = updateSnapshotImage(pendingUndo, image);
      afterChange(editor, true);
    });
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

  function runKeyCommand(
    editor: HTMLElement,
    event: KeyboardEvent,
    command: EditorCommand,
  ) {
    // Shortcuts always own their keys; Enter/Backspace/Tab rules fall back
    // to the browser where they don't apply.
    if (!isKeyRule(command)) event.preventDefault();
    const applied = applyEdit(
      editor,
      () => runCommand(editor, command),
      command.kind !== "native",
    );
    if (applied) event.preventDefault();
  }

  function handleKeyDown(event: KeyboardEvent) {
    const editor = editorEl;
    if (!editor) return;

    if (
      event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      event.code === "KeyM"
    ) {
      event.preventDefault();
      void import("../lib/write-music")
        .then((m) => m.toggleWriteMusic())
        // eslint-disable-next-line no-console
        .catch(console.error);
      return;
    }

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

    const command = commandForKey(event);
    if (command) runKeyCommand(editor, event, command);
  }

  return (
    <main class="min-h-screen">
      <div class="mx-auto max-w-3xl px-4 py-24 md:px-6 print:max-w-none print:p-0">
        <div
          aria-activedescendant={slash() ? slashActiveId() : undefined}
          aria-controls={slash() ? SLASH_MENU_ID : undefined}
          aria-label="Editor"
          autocapitalize={spellcheck() ? "sentences" : "off"}
          autocorrect={spellcheck() ? "on" : "off"}
          class="min-h-[75vh] w-full border-0 bg-transparent text-[1.22rem] leading-normal outline-none print:min-h-0 print:text-black"
          classList={{ [styles.editor!]: true }}
          contenteditable
          tabindex={0}
          onBlur={handleBlur}
          onClick={handleClick}
          onCompositionEnd={refreshSlash}
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
        <span class="text-neu-500 dark:text-neu-400 ml-auto px-1 font-mono text-xs tabular-nums">
          {words()} {words() === 1 ? "word" : "words"}
        </span>
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
