import {
  createEffect,
  createSignal,
  type JSX,
  Match,
  onCleanup,
  onMount,
  Show,
  splitProps,
  Switch,
} from "solid-js";

import { type ColorScheme, setScheme } from "./color-scheme";
import {
  CommandCenter,
  CommandCenterDialog,
  CommandCenterTrigger,
  CommandGroup,
  CommandInput,
  CommandItem as CommandCenterItem,
  type CommandItemProps as CommandCenterItemProps,
  CommandList,
  useCommandCenterCtx,
} from "./CommandCenter";
import { DialogCloseButton } from "./Dialog";
import { isMac } from "./isMac";
import { Kbd } from "./Kbd";
import { parseKeys } from "./parseKeys";
import { Shortcut } from "./Shortcut";

const INPUT_ID = "command-input";

export function Commands({
  posts,
  class: className,
}: {
  posts: { title: string; href: string }[];
  class?: string;
}) {
  const [clientside, setClientside] = createSignal(false);
  onMount(() => setClientside(true)); // workaround for Astro + Solid Hydration issue

  return (
    <CommandCenter inputId={INPUT_ID}>
      <CommandCenterTrigger
        classList={{
          "zaduma-hover-before h-12 w-12 rounded-sm dark:text-neu-400 dark:hover:text-neu-300": true,
          [className ?? ""]: true,
        }}
      />
      <Show when={clientside()} keyed>
        <CommandsPalette posts={posts} />
      </Show>
    </CommandCenter>
  );
}

export function CommandsPalette({
  posts,
}: {
  posts: { title: string; href: string }[];
}) {
  type CommandsPage = "posts" | "theme" | undefined;
  const { getInputValue } = useCommandCenterCtx();

  const [page, setPage] = createSignal<CommandsPage>();
  let dialog: HTMLDialogElement | undefined;

  const setColorScheme = (scheme: ColorScheme) => {
    if (page() !== "theme") return;
    setScheme(scheme);
    dialog?.close();
  };

  const getSelected = () =>
    dialog?.querySelector('[aria-selected="true"]') as HTMLElement | null;

  const keybindings = new Map<string, () => void>([
    [
      "backspace",
      () => {
        setPage(undefined);
      },
    ],
    [
      "escape",
      () => {
        setPage(undefined);
      },
    ],
    [
      "backspace",
      () => {
        if (!getInputValue()) setPage(undefined);
      },
    ],
    [
      "enter",
      () => {
        if (document.activeElement?.id === INPUT_ID) {
          getSelected()?.click();
        }
      },
    ],
    [
      "alt+t",
      () => {
        if (dialog && !dialog.open) dialog.showModal();
        setPage("theme");
      },
    ],
    [
      "cmd+k",
      () => {
        if (dialog) {
          if (dialog.open) dialog.close();
          else dialog.showModal();
        }
      },
    ],
    ["1", () => setColorScheme("light")],
    ["2", () => setColorScheme("dark")],
    ["3", () => setColorScheme(null)],
    [
      "alt+slash",
      () => {
        if (dialog && !dialog.open) dialog.showModal();
        document.getElementById(INPUT_ID)?.focus();
        setPage("posts");
      },
    ],
  ]);

  createEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      const cmdKey = isMac() ? event.metaKey : event.ctrlKey;
      const { shiftKey, altKey } = event;

      const modifiers = [cmdKey && "cmd", shiftKey && "shift", altKey && "alt"];

      const { code, key } = parseKeys(event);

      const found =
        keybindings.get(plus(...modifiers, code)) ||
        keybindings.get(plus(...modifiers, key));

      if (found) {
        if (cmdKey || altKey) event.preventDefault();
        found();
      }
    };

    window.addEventListener("keydown", onKeydown);

    onCleanup(() => window.removeEventListener("keydown", onKeydown));
  });

  const handleShortcut = (shortcut: string) => keybindings.get(shortcut)?.();

  return (
    <CommandCenterDialog
      onClose={() => setPage(undefined)}
      ref={(ref) => (dialog = ref)}
      class={
        "border-neu-300 bg-neu-50 font-text shadow-neu-950/40 backdrop:bg-neu-950/20 dark:border-neu-700 dark:bg-neu-900 max-w-container relative w-full transform flex-col overflow-hidden p-0 transition-all [&[open]]:flex"
      }
    >
      <div class="flex items-center gap-2 px-3 pt-3">
        <span
          aria-hidden
          class="text-accent-700 dark:text-accent-400 text-lg select-none"
        >
          ☞
        </span>
        <CommandInput
          aria-label="Commands"
          class="placeholder:text-neu-400 dark:placeholder:text-neu-500 relative w-full bg-transparent py-2.5 text-lg focus:outline-none"
          placeholder="What do you seek?"
          autofocus
        />
        <DialogCloseButton class="group cursor-pointer p-1 focus:outline-none">
          <Kbd aria-hidden>esc</Kbd>
          <span class="sr-only">Close</span>
        </DialogCloseButton>
      </div>
      <div
        aria-hidden
        class="text-neu-300 dark:text-neu-700 flex items-center gap-2 px-3 py-1"
      >
        <span class="h-px flex-1 bg-current" />
        <span class="text-accent-700/70 dark:text-accent-400/70">❦</span>
        <span class="h-px flex-1 bg-current" />
      </div>
      <CommandList class="overflow-scroll p-2">
        <Switch
          fallback={
            <>
              <CommandItem shortcut="alt+t" onClick={handleShortcut}>
                Set Theme
              </CommandItem>
              <CommandGroup heading={<GroupHeading>Posts</GroupHeading>}>
                <CommandItem shortcut="alt+slash" onClick={handleShortcut}>
                  Search Posts
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading={<GroupHeading>Links</GroupHeading>}>
                <CommandItem href="https://twitter.com/hasparus">
                  Twitter
                </CommandItem>
                <CommandItem href="https://github.com/hasparus/zaduma">
                  GitHub
                </CommandItem>
                <CommandItem href="https://github.com/hasparus/zaduma/issues">
                  Contact
                </CommandItem>
                <CommandItem href="/rss.xml">RSS</CommandItem>
              </CommandGroup>
            </>
          }
        >
          <Match when={page() === "theme"}>
            <CommandItem shortcut="1" onClick={handleShortcut}>
              Set Theme to Light
            </CommandItem>
            <CommandItem shortcut="2" onClick={handleShortcut}>
              Set Theme to Dark
            </CommandItem>
            <CommandItem shortcut="3" onClick={handleShortcut}>
              Set Theme to System
            </CommandItem>
          </Match>
          <Match when={page() === "posts"}>
            <CommandGroup heading={<GroupHeading>Posts</GroupHeading>}>
              {posts.map((p) => (
                <CommandItem href={p.href}>{p.title}</CommandItem>
              ))}
            </CommandGroup>
          </Match>
        </Switch>
      </CommandList>
    </CommandCenterDialog>
  );
}

interface CommonCommandItemProps extends Omit<
  CommandCenterItemProps,
  "onClick"
> {}
export type CommandItemProps = CommonCommandItemProps &
  (
    | {
        href?: never;
        shortcut: string;
        onClick: (shortcut: string) => void;
      }
    | { href: string; shortcut?: never; onClick?: never }
  );

function CommandItem(props: CommandItemProps) {
  const [own, rest] = splitProps(props, ["shortcut", "children", "onClick"]);

  const content = (
    <>
      {own.children}
      <Show when={own.shortcut} keyed>
        {(shortcut) => <Shortcut class="ml-1" shortcut={shortcut} />}
      </Show>
    </>
  );

  return (
    <CommandCenterItem
      class={
        "zaduma-hover-before selected:text-neu-900 dark:selected:text-neu-100 text-neu-700 dark:text-neu-300 relative flex w-full cursor-pointer justify-between rounded-sm p-2 transition-colors focus-visible:outline-black"
      }
      tabIndex={-1}
      onClick={() => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        if (own.shortcut) own.onClick!(own.shortcut);
      }}
      {...rest}
    >
      {content}
    </CommandCenterItem>
  );
}

function GroupHeading(props: { children: JSX.Element }) {
  return (
    <span class="all-small-caps text-neu-500 dark:text-neu-400 flex items-center gap-1.5 p-2 font-serif text-xs leading-none tracking-widest">
      <span aria-hidden class="text-neu-400 dark:text-neu-500">❧</span>
      {props.children}
    </span>
  );
}

function plus(...xs: (string | boolean | undefined | null)[]) {
  return xs.filter(Boolean).join("+");
}
