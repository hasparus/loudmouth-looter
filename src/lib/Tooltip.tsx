import { createUniqueId, type JSX } from "solid-js";

/**
 * Inline explanatory tooltip for prose, e.g. `<Tooltip text="…">term</Tooltip>`.
 * Reveal is driven by CSS (:hover / :focus-within), so it needs no hydration
 * and renders straight from the MDX component map like the other prose
 * components. The trigger is a real <button> for keyboard focus + screen
 * readers; `aria-describedby` ties it to the tip.
 *
 * ponytail: anchored above the trigger with no viewport-edge flip — fine for
 * short marginal notes; reach for a positioned island if a tip clips at the
 * screen edge or needs Escape-to-dismiss.
 */
export function Tooltip(props: { text: string; children: JSX.Element }) {
  const id = createUniqueId();
  return (
    <span class="group relative inline-block">
      <button
        type="button"
        aria-describedby={id}
        class="border-0 bg-transparent p-0 text-inherit underline decoration-neu-400 decoration-dotted underline-offset-[0.2em] dark:decoration-neu-500"
        style={{ cursor: "image-set(var(--cur-help)) 16 16, help" }}
      >
        {props.children}
      </button>
      <span
        role="tooltip"
        id={id}
        class="bg-neu-900 text-neu-50 dark:bg-neu-100 dark:text-neu-900 pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[16rem] -translate-x-1/2 rounded-md px-2.5 py-1.5 text-center text-xs leading-snug font-normal opacity-0 shadow-lg transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none"
      >
        {props.text}
      </span>
    </span>
  );
}
