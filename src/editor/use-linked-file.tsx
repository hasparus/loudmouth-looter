import { useRef, useState } from "react";

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
  const [supported] = useState(isFileAccessSupported);
  const [name, setName] = useState<string | null>(null);
  const [status, setStatus] = useState<FileStatus>("saved");
  const handle = useRef<FileSystemFileHandle | null>(null);
  const pending = useRef<string | null>(null);
  const draining = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function drain(): Promise<boolean> {
    if (draining.current) return await draining.current;
    if (!handle.current || pending.current === null) return true;

    let activeHtml: string | null = null;
    const slow = setTimeout(() => setStatus("saving"), 150);
    draining.current = (async () => {
      try {
        while (handle.current && pending.current !== null) {
          const html = pending.current;
          activeHtml = html;
          pending.current = null;
          await writeDocument(handle.current, html);
          activeHtml = null;
        }
        setStatus("saved");
        return true;
      } catch (error) {
        if (activeHtml !== null && pending.current === null)
          pending.current = activeHtml;
        console.warn("text-editor: file save failed", error);
        setStatus("error");
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
      setName(picked.name);
      setStatus("saved");
      return html;
    } catch (error) {
      console.warn("text-editor: could not open file", error);
      setStatus("error");
      return null;
    }
  }

  async function save(html: string): Promise<boolean> {
    if (!handle.current) {
      const picked = await pickFileToCreate();
      if (!picked) return false;
      handle.current = picked;
      setName(picked.name);
    }
    return await flushWrite(html);
  }

  async function close(html?: string): Promise<boolean> {
    const ok = html === undefined ? true : await flushWrite(html);
    if (!ok) return false;
    clearTimer();
    handle.current = null;
    pending.current = null;
    setName(null);
    setStatus("saved");
    return true;
  }

  return { close, flushWrite, name, open, queue, save, status, supported };
}
