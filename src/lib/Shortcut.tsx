import type { JSX } from "solid-js";
import { For } from "solid-js";

import { isMac } from "./isMac";
import { Kbd } from "./Kbd";

export interface ShortcutProps extends JSX.HTMLAttributes<HTMLElement> {
  shortcut: string;
}

export function Shortcut(props: ShortcutProps) {
  // This component cannot be used on serverside;
  const IS_MAC = typeof window !== "undefined" && isMac();

  return (
    <span
      {...props}
      class={props.class}
      classList={{
        ...props.classList,
        "inline-flex gap-1": true,
      }}
    >
      <For each={props.shortcut.split("+")}>
        {(key) => {
          if (!IS_MAC && key === "cmd") {
            key = "ctrl";
          } else if (key === "shift") {
            key = "⇧";
          } else if (key === "slash") {
            key = "/";
          }

          return <Kbd>{key}</Kbd>;
        }}
      </For>
    </span>
  );
}
