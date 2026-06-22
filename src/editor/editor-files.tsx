const ACCEPT: FilePickerAcceptType[] = [
  { accept: { "text/markdown": [".mdx", ".md"] }, description: "MDX document" },
];

export function isFileAccessSupported(): boolean {
  return (
    typeof globalThis.showOpenFilePicker === "function" &&
    typeof globalThis.showSaveFilePicker === "function"
  );
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function pickFileToOpen(): Promise<FileSystemFileHandle | null> {
  try {
    const [handle] = await globalThis.showOpenFilePicker({
      types: ACCEPT,
      multiple: false,
    });
    return handle;
  } catch (error) {
    if (isAbort(error)) return null;
    throw error;
  }
}

export async function pickFileToCreate(
  suggestedName = "untitled.mdx",
): Promise<FileSystemFileHandle | null> {
  try {
    return await globalThis.showSaveFilePicker({
      types: ACCEPT,
      suggestedName,
    });
  } catch (error) {
    if (isAbort(error)) return null;
    throw error;
  }
}

export async function readDocument(
  handle: FileSystemFileHandle,
): Promise<string> {
  const [{ mdxToHtml }, file] = await Promise.all([
    import("./editor-mdx"),
    handle.getFile(),
  ]);
  return mdxToHtml(await file.text());
}

export async function writeDocument(
  handle: FileSystemFileHandle,
  html: string,
): Promise<void> {
  const [{ htmlToMdx }, writable] = await Promise.all([
    import("./editor-mdx"),
    handle.createWritable(),
  ]);
  let closed = false;
  try {
    await writable.write(htmlToMdx(html));
    await writable.close();
    closed = true;
  } finally {
    if (!closed) {
      try {
        await writable.abort();
      } catch (error) {
        console.warn("text-editor: could not abort failed file write", error);
      }
    }
  }
}
