/** @jsxImportSource react */
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

export function SlashMenu({
  id,
  activeId,
  anchor,
  commands,
  count,
  index,
  onPick,
  optionId,
}: SlashMenuProps) {
  if (commands.length === 0) return null;

  const active = Math.min(index, commands.length - 1);

  return (
    <div
      className="font-text fixed z-40 overflow-hidden rounded-lg bg-white shadow-xl ring ring-neu-400/30 dark:bg-neu-900 dark:ring-neu-600/30"
      id={id}
      role="listbox"
      style={{
        width: anchor.width,
        left: anchor.left,
        top: anchor.top + 6,
      }}
    >
      {commands.map((command, i) => (
        <div
          aria-selected={i === active}
          className={cn(
            "flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left",
            optionId(command.name) === activeId &&
              "bg-neu-100 dark:bg-neu-800",
          )}
          id={optionId(command.name)}
          key={command.name}
          // Pointer-down (not click) so the editor keeps its selection.
          onMouseDown={(event) => {
            event.preventDefault();
            onPick(command);
          }}
          role="option"
        >
          <span className="w-28 shrink-0 font-mono text-xs text-neu-400 dark:text-neu-500">
            /{command.name}
          </span>
          <span className="flex-1 text-sm text-neu-700 dark:text-neu-300">
            {command.description}
          </span>
          {command.kind === "track" && command.shape && (
            <TrackPreview
              count={Math.min(count ?? command.defaultCount, 6)}
              shape={command.shape}
            />
          )}
        </div>
      ))}
    </div>
  );
}
