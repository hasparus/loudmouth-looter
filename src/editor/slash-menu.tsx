import { For, Show } from "solid-js";

import { cn } from "./cn";
import { type SlashCommand, TrackPreview } from "./editor-atoms";

interface SlashMenuProps {
  // The id of the currently highlighted option — echoed by the editor's
  // aria-activedescendant so assistive tech tracks the selection.
  activeId: string | undefined;
  // Left edge + width track the editor's text column; top sits below the caret.
  anchor: { width: number; left: number; top: number };
  commands: SlashCommand[];
  count: number | null;
  id: string;
  index: number;
  onPick: (command: SlashCommand) => void;
  optionId: (name: string) => string;
}

export function SlashMenu(props: SlashMenuProps) {
  const active = () => Math.min(props.index, props.commands.length - 1);

  return (
    <Show when={props.commands.length > 0}>
      <div
        class="font-text ring-neu-400/30 dark:bg-neu-900 dark:ring-neu-600/30 fixed z-40 overflow-hidden rounded-lg bg-white shadow-xl ring"
        id={props.id}
        role="listbox"
        style={{
          width: `${props.anchor.width}px`,
          left: `${props.anchor.left}px`,
          top: `${props.anchor.top + 6}px`,
        }}
      >
        <For each={props.commands}>
          {(command, i) => (
            <div
              aria-selected={i() === active()}
              class={cn(
                "flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left",
                props.optionId(command.name) === props.activeId &&
                  "bg-neu-100 dark:bg-neu-800",
              )}
              id={props.optionId(command.name)}
              onMouseDown={(event) => {
                event.preventDefault();
                props.onPick(command);
              }}
              role="option"
              tabIndex={-1}
            >
              <span class="text-neu-400 dark:text-neu-500 w-28 shrink-0 font-mono text-xs">
                /{command.name}
              </span>
              <span class="text-neu-700 dark:text-neu-300 flex-1 text-sm">
                {command.description}
              </span>
              <Show when={command.kind === "track" && command.shape}>
                <TrackPreview
                  count={Math.min(props.count ?? command.defaultCount, 6)}
                  shape={command.shape!}
                />
              </Show>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}
