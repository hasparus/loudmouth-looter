/** Display-face options for the corner FontSwitcher. The stored value is the
 * full CSS font stack (see InitFont.astro), so order/labels can change freely
 * without migrating localStorage. `--font-serif` is overridden inline on <html>,
 * which beats the @theme `:root` default and cascades to every heading. */

export const STORAGE_KEY = "ⲍ 🔤";
export const CSS_VAR = "--font-serif";

export interface FontOption {
  id: string;
  /** Human label, rendered in its own face as a live preview. */
  label: string;
  /** CSS font-family stack written to --font-serif and localStorage. */
  stack: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: "avara", label: "Avara", stack: '"Avara", Georgia, serif' },
  {
    id: "im-fell",
    label: "IM Fell English",
    stack: '"IM Fell English SC", Georgia, serif',
  },
  { id: "trickster", label: "Trickster", stack: '"Trickster", Georgia, serif' },
  {
    id: "director",
    label: "Director",
    stack: '"Director Variable", Georgia, serif',
  },
];

const DEFAULT_STACK = FONT_OPTIONS[0]!.stack;

export const setFont = (stack: string): void => {
  document.documentElement.style.setProperty(CSS_VAR, stack);
  if (typeof localStorage !== "undefined") {
    if (stack === DEFAULT_STACK) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, stack);
  }
};

export const getStoredFont = (): string => {
  if (typeof localStorage === "undefined") return DEFAULT_STACK;
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_STACK;
};
