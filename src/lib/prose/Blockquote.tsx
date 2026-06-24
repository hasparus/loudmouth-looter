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
        "bg-neu-100 dark:bg-neu-800 py-4 px-6 my-4!": true,
        [styles.Blockquote!]: true,
      }}
    />
  );
}
