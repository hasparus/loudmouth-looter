import { Index, type JSX, Show, splitProps } from "solid-js";

import { Heading } from "../lib/prose/Heading";

import { cn } from "./cn";
import { MOVE_ARTICLE_CLASS } from "./move-dom";
import { slugFromTitle } from "./move-props";

export interface MoveProps extends JSX.HTMLAttributes<HTMLElement> {
  checkboxes?: number;
  children: JSX.Element;
  id?: string;
  illuminated?: boolean;
  isBaseMove?: boolean;
  requirement?: string;
  resourceName?: string;
  resources?: number;
  size?: "sm";
  title?: string;
}

interface MoveWithTitleProps extends MoveProps {
  title: string;
}

function MoveWithTitle(props: MoveWithTitleProps) {
  const isSmall = () => props.size === "sm";
  const id = () => props.id ?? slugFromTitle(props.title);

  return (
    <article
      class={cn(
        MOVE_ARTICLE_CLASS,
        props.illuminated ? "te-move-illuminated" : undefined,
        props.class,
        isSmall() ? "space-y-2" : undefined,
      )}
    >
      <div class="flex-1">
        <div class={cn("flex items-center", isSmall() ? "gap-2" : "gap-2.5")}>
          <Show when={!props.isBaseMove}>
            <input
              aria-describedby={id()}
              class={cn(
                "aspect-square shrink-0",
                isSmall() ? "mt-[-3.5px] size-4" : "-mt-0.75 size-4.5",
              )}
              id={`${id()}-checkbox`}
              name={id()}
              type="checkbox"
            />
          </Show>
          <Heading
            level="h3"
            class={cn(
              "text-neu-800 dark:text-neu-200 my-0! font-serif font-bold tracking-wide",
              isSmall() ? "" : "text-xl [text-box-trim:trim-end]",
            )}
            id={id()}
          >
            {props.title}
          </Heading>
          <Show when={!!props.resources}>
            <div class="text-neu-500 dark:text-neu-100 ml-auto flex items-center gap-1 text-sm">
              <span
                class={cn(
                  "translate-y-px tracking-wider [text-box-trim:trim-end]",
                  isSmall() ? "text-xs" : "",
                )}
              >
                {props.resourceName}
              </span>
              <div class="ml-1 flex gap-0.5">
                <Index each={Array.from({ length: props.resources ?? 0 })}>
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
          <Show when={!!props.checkboxes}>
            <div class="text-neu-500 dark:text-neu-200 ml-auto flex items-center gap-1 text-sm">
              <div class="ml-1 flex gap-0.75">
                <Index each={Array.from({ length: props.checkboxes ?? 0 })}>
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
        <Show when={props.requirement}>
          <p class="text-neu-500 dark:text-neu-200 mt-0.75 text-sm">
            (Requires {props.requirement})
          </p>
        </Show>
        <div
          class={cn(
            "text-neu-900 dark:text-neu-200 flex flex-col gap-(--block-mb) leading-relaxed",
            isSmall() ? "mt-1 text-sm" : "mt-2",
          )}
          data-move-body=""
        >
          {props.children}
        </div>
      </div>
    </article>
  );
}

function BaseMove(props: MoveProps) {
  const [, rest] = splitProps(props, [
    "checkboxes",
    "children",
    "class",
    "illuminated",
    "isBaseMove",
    "requirement",
    "resourceName",
    "resources",
    "size",
    "title",
  ]);
  return (
    <article
      {...rest}
      class={cn(
        "te-move",
        props.illuminated ? "te-move-illuminated" : undefined,
        props.class,
      )}
    >
      {props.children}
    </article>
  );
}

export function Move(props: MoveProps) {
  return (
    <Show when={props.title} fallback={<BaseMove {...props} />}>
      {(title) => <MoveWithTitle {...props} title={title()} />}
    </Show>
  );
}
