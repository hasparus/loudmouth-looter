import { Index, type JSX, mergeProps, Show } from "solid-js";

import { cn } from "./cn";
import { MOVE_ARTICLE_CLASS } from "./move-dom";
import { slugFromTitle } from "./move-props";

export interface MoveProps {
  checkboxes?: number;
  children: JSX.Element;
  className?: string;
  id?: string;
  isBaseMove?: boolean;
  requirement?: string;
  resourceName?: string;
  resources?: number;
  size?: "sm";
  title?: string;
}

function MoveWithTitle(props: MoveProps & { title: string }) {
  const merged = mergeProps(
    { className: "", isBaseMove: false, resourceName: "" },
    props,
  );
  const isSmall = () => merged.size === "sm";
  const id = () => merged.id ?? slugFromTitle(merged.title);

  return (
    <article
      class={cn(
        MOVE_ARTICLE_CLASS,
        merged.className,
        isSmall() ? "space-y-2" : undefined,
      )}
    >
      <div class="flex-1">
        <div class={cn("flex items-center", isSmall() ? "gap-2" : "gap-2.5")}>
          <Show when={!merged.isBaseMove}>
            <input
              aria-describedby={`${id()}-title`}
              class={cn(
                "aspect-square shrink-0",
                isSmall() ? "mt-[-3.5px] size-4" : "-mt-0.75 size-4.5",
              )}
              id={id()}
              name={id()}
              type="checkbox"
            />
          </Show>
          <h3
            class={`text-neu-800 dark:text-neu-200 font-serif font-bold tracking-wide ${
              isSmall() ? "" : "text-xl [text-box-trim:trim-end]"
            }`}
            id={`${id()}-title`}
          >
            {merged.title}
          </h3>
          <Show when={!!merged.resources}>
            <div class="text-neu-500 dark:text-neu-100 ml-auto flex items-center gap-1 text-sm">
              <span
                class={cn(
                  "translate-y-px tracking-wider [text-box-trim:trim-end]",
                  isSmall() ? "text-xs" : "",
                )}
              >
                {merged.resourceName}
              </span>
              <div class="ml-1 flex gap-0.5">
                <Index each={Array.from({ length: merged.resources ?? 0 })}>
                  {(_, i) => (
                    <input
                      class={
                        isSmall()
                          ? "size-3 rounded-full"
                          : "size-4 rounded-full"
                      }
                      data-checkbox-marker="x"
                      name={`${id()}-r-${i}`}
                      type="checkbox"
                    />
                  )}
                </Index>
              </div>
            </div>
          </Show>
          <Show when={!!merged.checkboxes}>
            <div class="text-neu-500 dark:text-neu-200 ml-auto flex items-center gap-1 text-sm">
              <div class="ml-1 flex gap-0.75">
                <Index each={Array.from({ length: merged.checkboxes ?? 0 })}>
                  {(_, i) => (
                    <input
                      class="aspect-square size-3.5 shrink-0"
                      name={`${id()}-c-${i}`}
                      type="checkbox"
                    />
                  )}
                </Index>
              </div>
            </div>
          </Show>
        </div>
        <Show when={merged.requirement}>
          <p class="text-neu-500 dark:text-neu-200 mt-0.75 text-sm">
            (Requires {merged.requirement})
          </p>
        </Show>
        <div
          class={cn(
            "text-neu-900 dark:text-neu-200 flex flex-col gap-(--block-mb) leading-relaxed",
            isSmall() ? "mt-1 text-sm" : "mt-2",
          )}
          data-move-body=""
        >
          {merged.children}
        </div>
      </div>
    </article>
  );
}

export function Move(props: MoveProps) {
  const merged = mergeProps(
    { className: "", isBaseMove: false, resourceName: "" },
    props,
  );

  return (
    <Show
      when={merged.title}
      fallback={<article class="te-move">{merged.children}</article>}
    >
      {(title) => <MoveWithTitle {...merged} title={title()} />}
    </Show>
  );
}
