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
        "bg-white/30 dark:bg-neu-700/20 py-4 px-6 [p+&:has(+p)]:my-4!": true,
        [styles.Blockquote!]: true,
      }}
    />
  );
}
