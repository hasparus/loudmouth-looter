import { For, Show, type JSX } from "solid-js";

const cn = (...classes: (string | false | undefined)[]) =>
  classes.filter(Boolean).join(" ");

export function Title(props: { children: JSX.Element }) {
  return (
    <h2 class="m-0 max-w-[88%] font-serif text-[clamp(30px,4.15cqw,74px)] leading-[0.94] font-extrabold tracking-tight">
      {props.children}
    </h2>
  );
}

export function Hero(props: { class?: string; children: JSX.Element }) {
  return (
    <div
      class={cn(
        "mt-[6%] max-w-[90%] font-serif text-[clamp(38px,5.2cqw,94px)] leading-[0.94] font-extrabold tracking-[-0.035em]",
        props.class,
      )}
    >
      {props.children}
    </div>
  );
}

export function Quote(props: { title: string; children: JSX.Element }) {
  return (
    <div class="flex h-full flex-col">
      <Title>{props.title}</Title>
      <Hero class="mt-auto mb-[15%] max-w-[92%]">{props.children}</Hero>
    </div>
  );
}

export function Aside(props: { children: JSX.Element }) {
  return (
    <div class="text-neu-600 dark:text-neu-300 mt-auto mb-[4.5%] rotate-[-0.6deg] text-[clamp(20px,2.1cqw,38px)] leading-none">
      {props.children}
    </div>
  );
}

export function Bullets(props: {
  items: (string | JSX.Element)[];
  compact?: boolean;
  class?: string;
}) {
  const compact = () => props.compact ?? props.items.length > 6;
  return (
    <ul
      class={cn(
        "mt-[7%] grid list-none p-0 leading-[1.06]",
        compact()
          ? "gap-[0.28em] text-[clamp(17px,1.78cqw,32px)]"
          : "gap-[0.45em] text-[clamp(18px,2.15cqw,39px)]",
        props.class,
      )}
    >
      <For each={props.items}>
        {(item) => (
          <li class="grid grid-cols-[1em_1fr] items-start">
            <span
              class="text-accent-800 dark:text-accent-500 text-[0.72em] leading-[1.35]"
              aria-hidden="true"
            >
              ◈
            </span>
            <span>{item}</span>
          </li>
        )}
      </For>
    </ul>
  );
}

export function Cover(props: {
  title: string;
  hero: string;
  tags: string[];
  flourish?: string;
}) {
  return (
    <div
      class="relative grid h-full gap-[2%]"
      classList={{
        "grid-cols-[minmax(0,1fr)_31%]": Boolean(props.flourish),
        "grid-cols-1": !props.flourish,
      }}
    >
       <div class="relative z-2 flex min-w-0 flex-col">
        <h1 class="m-0 max-w-full font-serif text-[clamp(58px,7.35cqw,134px)] leading-[0.82] font-normal tracking-[-0.018em]">
          {props.title}
        </h1>
        <div class="text-accent-500 mt-[4.2%] font-serif text-[clamp(38px,4.6cqw,82px)] leading-[0.88] [text-shadow:2px_2px_0_rgb(0_0_0/0.35)]">
          {props.hero}
        </div>
        <div class="mt-auto mb-[5%] flex flex-wrap gap-[0.65rem]">
          <For each={props.tags}>
            {(tag) => (
              <span class="border-neu-500/55 text-neu-600 dark:text-neu-300 border px-[0.65rem] pt-[0.35rem] pb-1 text-[clamp(10px,1.05cqw,19px)] tracking-[0.04em]">
                {tag}
              </span>
            )}
          </For>
        </div>
      </div>
      <Show when={props.flourish}>
        {(flourish) => (
          <div
            class="absolute top-[42%] right-[0.5%] z-1 -translate-y-1/2 rotate-3 font-serif text-[clamp(330px,38cqw,690px)] leading-[0.62] text-[#f8d34b] drop-shadow-[0_18px_20px_rgb(0_0_0/0.28)] select-none [text-shadow:4px_4px_0_#0a0908,-2px_2px_0_#0a0908,2px_-2px_0_#0a0908,-2px_-2px_0_#0a0908]"
            aria-hidden="true"
          >
            {flourish()}
          </div>
        )}
      </Show>
    </div>
  );
}

export function FullImage(props: { src: string; alt: string; href?: string }) {
  const image = (
    <img
      class="absolute inset-0 size-full object-contain object-center"
      src={props.src}
      alt={props.alt}
    />
  );
  return (
    <Show when={props.href} fallback={image}>
      {(href) => (
        <a
          class="absolute inset-0"
          href={href()}
          target="_blank"
          rel="noreferrer"
          aria-label={props.alt}
        >
          {image}
        </a>
      )}
    </Show>
  );
}

export function Columns(props: { split?: boolean; children: JSX.Element }) {
  return (
    <div
      class={cn(
        "mt-[8%] grid grid-cols-2 gap-[7%]",
        props.split && "mt-[6%] items-start",
      )}
    >
      {props.children}
    </div>
  );
}

export function Card(props: { title: string; items: string[] }) {
  return (
    <div class="border-accent-800 dark:border-accent-500 border-t-2 pt-[1.1rem]">
      <h3 class="mt-0 mb-3 font-serif text-[clamp(24px,2.75cqw,50px)] leading-[0.96]">
        {props.title}
      </h3>
      <Bullets items={props.items} compact class="mt-0" />
    </div>
  );
}

export function BoxedText(props: { label: string; children: JSX.Element }) {
  return (
    <div class="border-neu-400 bg-neu-200/45 text-neu-600 border p-[1.2rem_1.35rem] text-[clamp(15px,1.45cqw,26px)] leading-[1.26]">
      <div class="text-neu-500 mb-[0.7rem] text-[0.52em] tracking-[0.12em] uppercase">
        {props.label}
      </div>
      {props.children}
    </div>
  );
}

export function Impressions(props: { items: string[] }) {
  return (
    <div>
      <div class="text-accent-800 mb-[0.7rem] text-[0.52em] tracking-[0.12em] uppercase">
        impressions
      </div>
      <Bullets items={props.items} compact class="mt-0" />
    </div>
  );
}
