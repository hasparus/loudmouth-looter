import { createStore } from "solid-js/store";

import {
  isFileAccessSupported,
  pickFileToCreate,
  pickFileToOpen,
  readDocument,
  writeDocument,
} from "./editor-files";

export type FileStatus = "error" | "saved" | "saving";

export interface LinkedFile {
  close: (html?: string) => Promise<boolean>;
  flushWrite: (html: string) => Promise<boolean>;
  name: string | null;
  open: () => Promise<string | null>;
  queue: (html: string) => void;
  save: (html: string) => Promise<boolean>;
  status: FileStatus;
  supported: boolean;
}

const WRITE_DEBOUNCE_MS = 600;

export function useLinkedFile(): LinkedFile {
  const [state, setState] = createStore<{
    name: string | null;
    status: FileStatus;
    supported: boolean;
  }>({
    name: null,
    status: "saved",
    supported: isFileAccessSupported(),
  });
  const handle: { current: FileSystemFileHandle | null } = { current: null };
  const pending: { current: string | null } = { current: null };
  const draining: { current: Promise<boolean> | null } = { current: null };
  const timer: { current: ReturnType<typeof setTimeout> | null } = {
    current: null,
  };

  async function drain(): Promise<boolean> {
    if (draining.current) return await draining.current;
    if (!handle.current || pending.current === null) return true;

    let activeHtml: string | null = null;
    const slow = setTimeout(() => setState("status", "saving"), 150);
    draining.current = (async () => {
      try {
        while (handle.current && pending.current !== null) {
          const html = pending.current;
          activeHtml = html;
          pending.current = null;
          await writeDocument(handle.current, html);
          activeHtml = null;
        }
        setState("status", "saved");
        return true;
      } catch (error) {
        if (activeHtml !== null && pending.current === null)
          pending.current = activeHtml;
        console.warn("text-editor: file save failed", error);
        setState("status", "error");
        return false;
      } finally {
        clearTimeout(slow);
        draining.current = null;
      }
    })();

    return await draining.current;
  }

  function clearTimer() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function queue(html: string) {
    if (!handle.current) return;
    pending.current = html;
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      void drain();
    }, WRITE_DEBOUNCE_MS);
  }

  async function flushWrite(html: string): Promise<boolean> {
    if (!handle.current) return true;
    pending.current = html;
    clearTimer();
    return await drain();
  }

  async function open(): Promise<string | null> {
    const picked = await pickFileToOpen();
    if (!picked) return null;
    try {
      const html = await readDocument(picked);
      handle.current = picked;
      pending.current = null;
      setState("name", picked.name);
      setState("status", "saved");
      return html;
    } catch (error) {
      console.warn("text-editor: could not open file", error);
      setState("status", "error");
      return null;
    }
  }

  async function save(html: string): Promise<boolean> {
    if (!handle.current) {
      const picked = await pickFileToCreate();
      if (!picked) return false;
      handle.current = picked;
      setState("name", picked.name);
    }
    return await flushWrite(html);
  }

  async function close(html?: string): Promise<boolean> {
    const ok = html === undefined ? true : await flushWrite(html);
    if (!ok) return false;
    clearTimer();
    handle.current = null;
    pending.current = null;
    setState("name", null);
    setState("status", "saved");
    return true;
  }

  return {
    close,
    flushWrite,
    open,
    queue,
    save,
    get name() {
      return state.name;
    },
    get status() {
      return state.status;
    },
    get supported() {
      return state.supported;
    },
  };
}
