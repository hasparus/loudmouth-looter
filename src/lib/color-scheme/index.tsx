const STORAGE_KEY = "ⲍ 🎨";

export type ColorScheme = "light" | "dark" | /* system */ null;

const setClass = (isDark: boolean) =>
  document.documentElement.classList.toggle("dark", isDark);

export const setScheme = (scheme: ColorScheme): void => {
  {
    let isDark: boolean;
    if (scheme) {
      if (window.ⲍ_schemeMql && window.ⲍ_schemeMqlListener) {
        window.ⲍ_schemeMql.removeEventListener(
          "change",
          window.ⲍ_schemeMqlListener,
        );
        delete window.ⲍ_schemeMqlListener;
      }

      isDark = scheme === "dark";
    } else {
      const mql = (window.ⲍ_schemeMql ||= window.matchMedia(
        "(prefers-color-scheme: dark)",
      ));

      const onSchemeChange = (e: MediaQueryListEvent) => setClass(e.matches);
      mql.addEventListener("change", onSchemeChange);
      window.ⲍ_schemeMqlListener = onSchemeChange;
      isDark = mql.matches;
    }

    setClass(isDark);
  }

  if (typeof localStorage !== "undefined") {
    if (scheme) localStorage.setItem(STORAGE_KEY, scheme);
    else localStorage.removeItem(STORAGE_KEY);
  }
};

export const getStoredScheme = (): ColorScheme => {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY) as ColorScheme;
};

// Reading from localStorage and prefers-color-scheme
// and writing to documentElement.classList happens in InitializeColorScheme
export const getEffectiveScheme = (): "dark" | "light" => {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
};

declare global {
  interface Window {
    ⲍ_schemeMql?: MediaQueryList;
    ⲍ_schemeMqlListener?: (e: MediaQueryListEvent) => void;
  }
}
