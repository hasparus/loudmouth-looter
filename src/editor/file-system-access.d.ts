
interface FilePickerAcceptType {
  accept: Record<string, readonly string[] | string>;
  description?: string;
}

interface OpenFilePickerOptions {
  excludeAcceptAllOption?: boolean;
  multiple?: boolean;
  types?: FilePickerAcceptType[];
}

interface SaveFilePickerOptions {
  excludeAcceptAllOption?: boolean;
  suggestedName?: string;
  types?: FilePickerAcceptType[];
}

declare function showOpenFilePicker(
  options?: OpenFilePickerOptions,
): Promise<FileSystemFileHandle[]>;

declare function showSaveFilePicker(
  options?: SaveFilePickerOptions,
): Promise<FileSystemFileHandle>;
