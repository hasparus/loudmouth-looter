import { For, Show } from "solid-js";

export function Pipeline(props: { steps: string[] }) {
  return (
    <div class="mt-[10%] grid grid-cols-5 items-stretch gap-[1.1%]">
      <For each={props.steps}>
        {(step, i) => (
          <div class="border-neu-300 bg-neu-100/78 relative grid min-h-38 place-items-center border p-4 text-center text-[clamp(18px,1.75cqw,32px)] leading-[0.98]">
            {step}
            <Show when={i() < props.steps.length - 1}>
              <span class="text-accent-800 absolute top-[40%] right-[-11%] z-2 text-[1.5em]">
                →
              </span>
            </Show>
          </div>
        )}
      </For>
    </div>
  );
}

export function Triangle(props: { nodes: [string, string, string] }) {
  return (
    <div class="relative mx-auto mt-[4%] aspect-[1.45] w-[min(62%,36rem)]">
      <svg
        class="absolute inset-[8%_10%] h-[78%] w-[80%] overflow-visible"
        viewBox="0 0 100 70"
        aria-hidden="true"
      >
        <line
          class="stroke-accent-800 stroke-[1.5] opacity-[0.78]"
          x1="50"
          y1="5"
          x2="13"
          y2="63"
        />
        <line
          class="stroke-accent-800 stroke-[1.5] opacity-[0.78]"
          x1="50"
          y1="5"
          x2="87"
          y2="63"
        />
        <line
          class="stroke-accent-800 stroke-[1.5] opacity-[0.78]"
          x1="13"
          y1="63"
          x2="87"
          y2="63"
        />
      </svg>
      <div class="border-neu-400 bg-neu-100/92 absolute top-0 left-[34.5%] grid min-h-18 w-[31%] place-items-center border p-[0.6rem] text-center text-[clamp(16px,1.7cqw,30px)] leading-[0.95]">
        {props.nodes[0]}
      </div>
      <div class="border-neu-400 bg-neu-100/92 absolute bottom-0 left-[4%] grid min-h-18 w-[31%] place-items-center border p-[0.6rem] text-center text-[clamp(16px,1.7cqw,30px)] leading-[0.95]">
        {props.nodes[1]}
      </div>
      <div class="border-neu-400 bg-neu-100/92 absolute right-[4%] bottom-0 grid min-h-18 w-[31%] place-items-center border p-[0.6rem] text-center text-[clamp(16px,1.7cqw,30px)] leading-[0.95]">
        {props.nodes[2]}
      </div>
    </div>
  );
}

export function Systems(props: { rows: [name: string, technique: string][] }) {
  return (
    <div class="mt-[4.2%] grid gap-[clamp(5px,0.55cqw,10px)]">
      <For each={props.rows}>
        {([name, technique]) => (
          <div class="border-neu-300/80 grid grid-cols-[0.9fr_1.45fr] items-baseline gap-[2%] border-t pt-[clamp(5px,0.5cqw,9px)]">
            <div class="text-[clamp(17px,1.85cqw,34px)] leading-[0.96]">
              {name}
            </div>
            <div class="text-neu-600 text-[clamp(15px,1.55cqw,28px)] leading-[0.98]">
              {technique}
            </div>
          </div>
        )}
      </For>
    </div>
  );
}

function ZagrajmyMark() {
  return (
    <svg
      class="text-neu-900 size-[1.05em] shrink-0"
      viewBox="0 0 120 120"
      aria-hidden="true"
    >
      <path
        d="M92 60C92 91.82 91.82 92 60 92C28.18 92 28 91.82 28 60C28 28.18 28.18 28 60 28C91.82 28 92 28.18 92 60Z"
        fill="#f85a3c"
      />
      <path
        d="M75.5 11.5C75.5 21.05 74.09 22 60 22C45.91 22 44.5 21.05 44.5 11.5C44.5 1.95 45.91 1 60 1C74.09 1 75.5 1.95 75.5 11.5Z"
        fill="currentColor"
      />
      <path
        d="M119 60C119 74.09 118.05 75.5 108.5 75.5C98.95 75.5 98 74.09 98 60C98 45.91 98.95 44.5 108.5 44.5C118.05 44.5 119 45.91 119 60Z"
        fill="currentColor"
      />
      <path
        d="M75.5 108.5C75.5 118.05 74.09 119 60 119C45.91 119 44.5 118.05 44.5 108.5C44.5 98.95 45.91 98 60 98C74.09 98 75.5 98.95 75.5 108.5Z"
        fill="currentColor"
      />
      <path
        d="M22 60C22 74.09 21.05 75.5 11.5 75.5C1.95 75.5 1 74.09 1 60C1 45.91 1.95 44.5 11.5 44.5C21.05 44.5 22 45.91 22 60Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Bio(props: {
  image: string;
  name: string;
  links: readonly (readonly [label: string, href: string])[];
}) {
  return (
    <div class="absolute inset-x-0 top-[8.2%] bottom-[8.8%] grid grid-cols-2 items-center">
      <div class="text-neu-600 flex min-w-0 flex-col items-start gap-[0.12em] pr-[6%] pl-[6.2cqw] text-[clamp(18px,2.05cqw,36px)] leading-[1.24]">
        <span class="text-neu-900 mb-[0.5em] font-serif text-[1.18em] leading-[1.08] font-extrabold tracking-[0.04em] [font-variant-caps:small-caps]">
          {props.name}
        </span>
        <For each={props.links}>
          {([label, href]) => (
            <a
              class="hover:text-accent-800 focus-visible:text-accent-800 focus-visible:outline-accent-600 inline-flex items-center gap-[0.35em] text-inherit no-underline focus-visible:outline-2 focus-visible:outline-offset-3"
              href={href}
              target="_blank"
              rel="noreferrer"
            >
              <Show when={href === "https://zagrajmy.net"}>
                <ZagrajmyMark />
              </Show>
              <span class="underline decoration-1 underline-offset-[0.2em]">
                {label}
              </span>
            </a>
          )}
        </For>
      </div>
      <div class="h-full min-h-0 min-w-0 pr-[5.6cqw]">
        <img
          class="block size-full object-contain object-right drop-shadow-[0_14px_22px_rgb(28_25_23/0.12)]"
          src={props.image}
          alt=""
        />
      </div>
    </div>
  );
}
