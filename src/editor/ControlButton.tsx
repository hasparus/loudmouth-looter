import { type JSX, splitProps } from "solid-js";

const controlButtonClass =
  "flex font-mono text-xs items-center justify-center px-1 py-0.5 text-neu-500 transition hover:duration-0 hover:bg-neu-200/70 hover:text-neu-900 dark:text-neu-400 dark:hover:bg-neu-800 dark:hover:text-neu-50";

export function ControlButton(
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const [local, rest] = splitProps(props, ["class", "type"]);
  return (
    <button
      {...rest}
      type={local.type ?? "button"}
      class={local.class ? `${controlButtonClass} ${local.class}` : controlButtonClass}
    />
  );
}
