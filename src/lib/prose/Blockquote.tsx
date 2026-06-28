import type { JSX } from "solid-js";

import styles from "./Blockquote.module.css";

export function Blockquote(
  props: JSX.BlockquoteHTMLAttributes<HTMLQuoteElement>,
) {
  return (
    <blockquote
      {...props}
      classList={{
        ...props.classList,
        "bg-white/60 dark:bg-neu-700/30 py-4 px-6 [:is(p,aside)+&:has(+:is(p,aside))]:my-4!": true,
        [styles.Blockquote!]: true,
      }}
    />
  );
}
