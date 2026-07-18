/* eslint-disable better-tailwindcss/no-unknown-classes */
import type { JSX } from "solid-js";

export interface PrintMoveProps {
  name: string;
  span?: "3" | "4" | "full";
  class?: string;
  children: JSX.Element;
}

/**
 * The printable's move card: illuminated initial image standing in for the
 * first letter of the name, body text wrapping around it (see the pretext
 * relayout script in index.astro). The blog renders the same rule MDX through
 * its own Move component — only the content is shared, not the frame.
 */
export function PrintMove(props: PrintMoveProps) {
  const trimmed = () => props.name.trim();
  const rest = () => trimmed().slice(1);
  const initialSrc = () =>
    `/books/why-dragon/initials/${trimmed()
      .toLowerCase()
      .replaceAll(/[^\w]+/g, "-")
      .replaceAll(/^-+|-+$/g, "")}.png`;
  const spanClass = () =>
    props.span === "full"
      ? "wd-full"
      : props.span === "4"
        ? "wd-span-4"
        : "wd-span-3";

  return (
    <div
      class={["wd-move", spanClass(), props.class].filter(Boolean).join(" ")}
    >
      <span class="wd-initial" aria-hidden="true">
        <img
          src={initialSrc()}
          width="768"
          height="768"
          alt=""
          loading="eager"
          decoding="async"
        />
      </span>
      <div class="wd-move-copy">
        <h3 class="wd-move-name" aria-label={trimmed()}>
          {rest()}
        </h3>
        {props.children}
      </div>
    </div>
  );
}
