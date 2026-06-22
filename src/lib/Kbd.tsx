import { createEffect, type JSX } from "solid-js";

import { parseKeys } from "./parseKeys";

export interface KbdProps extends JSX.HTMLAttributes<HTMLElement> {
  code?: string;
}

export function Kbd(props: KbdProps) {
  let ref!: HTMLElement;

  createEffect(() => {
    return setDataPressedOnKeyDown(props, ref);
  });

  return (
    <kbd
      ref={ref}
      {...props}
      class={
        "border-neu-300 bg-neu-50 dark:border-neu-700 dark:bg-neu-800 all-small-caps font-text text-neu-500 dark:text-neu-400 trim-start-alphabetic inline-block aspect-[2] min-w-4 shrink-0 rounded border border-b-2 p-1 text-base leading-none font-medium tracking-wide tabular-nums [corner-shape:superellipse(-.33)] group-hover:border-b group-hover:shadow-[inset_0_1px_1px_0_rgba(0,0,0,0.025)] group-focus:outline-solid data-pressed:border-b" +
        (props.class ? ` ${props.class}` : "")
      }
    />
  );
}

function setDataPressedOnKeyDown(props: KbdProps, ref: HTMLElement) {
  const onKeyDown = (event: KeyboardEvent) => {
    if (currentKeyPressed(props, event)) ref.setAttribute("data-pressed", "");
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (currentKeyPressed(props, event)) ref.removeAttribute("data-pressed");
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  };
}

function currentKeyPressed(props: KbdProps, event: KeyboardEvent) {
  const { code, key } = parseKeys(event);
  const children = props.children;

  return (
    props.code === code ||
    (typeof children === "string" && [code, key].includes(children.trim()))
  );
}
