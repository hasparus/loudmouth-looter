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
    <span class="group/tooltip relative inline-block">
      <button
        type="button"
        aria-describedby={id}
        class="decoration-accent-500 dark:decoration-accent-400 cursor-help border-0 bg-transparent p-0 text-inherit underline decoration-wavy underline-offset-[0.2em]"
      >
        {props.children}
      </button>
      <span
        role="tooltip"
        id={id}
        class="bg-neu-900 text-neu-50 dark:bg-neu-100 dark:text-neu-900 motion-safe:group-[:is(:hover,:focus-within)]/tooltip:ease-pop-up pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-screen -translate-x-1/2 rounded-md px-2.5 py-1.5 text-center text-base/snug font-normal opacity-0 shadow-lg transition-opacity duration-150 ease-[ease-in] group-[:is(:hover,:focus-within)]/tooltip:opacity-100 group-[:is(:hover,:focus-within)]/tooltip:ease-[ease-out] motion-safe:origin-bottom motion-safe:transform-[translate3d(0,3px,0)_scale(0.9)] motion-safe:transition-[opacity,transform] motion-safe:group-[:is(:hover,:focus-within)]/tooltip:transform-[translate3d(0,0,0)_scale(1)] motion-safe:group-[:is(:hover,:focus-within)]/tooltip:duration-400"
      >
        {props.text}
      </span>
    </span>
  );
}
