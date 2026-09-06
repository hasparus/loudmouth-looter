import { For, Show, type JSX } from "solid-js";

export function Title(props: { kicker?: string; children: JSX.Element }) {
  return (
    <>
      <Show when={props.kicker}>
        {(kicker) => <div class="kicker">{kicker()}</div>}
      </Show>
      <h2 class="slide-title">{props.children}</h2>
    </>
  );
}

export function Hero(props: { children: JSX.Element }) {
  return <div class="display">{props.children}</div>;
}

/** Full-height slide ending in one big line. */
export function Quote(props: { title: string; children: JSX.Element }) {
  return (
    <div class="quote">
      <Title>{props.title}</Title>
      <div class="display">{props.children}</div>
    </div>
  );
}

export function Aside(props: { children: JSX.Element }) {
  return <div class="aside">{props.children}</div>;
}

export function Bullets(props: { items: string[]; compact?: boolean }) {
  return (
    <ul
      class="bullets"
      classList={{ compact: props.compact ?? props.items.length > 6 }}
    >
      <For each={props.items}>{(item) => <li>{item}</li>}</For>
    </ul>
  );
}

export function Cover(props: { title: string; hero: string; tags: string[] }) {
  return (
    <div class="cover-layout">
      <div class="cover-copy">
        <h1 class="cover-title">{props.title}</h1>
        <div class="cover-hero">{props.hero}</div>
        <div class="tag-row cover-tags">
          <For each={props.tags}>{(tag) => <span class="tag">{tag}</span>}</For>
        </div>
      </div>
      <div class="cover-exclamation" aria-hidden="true">
        !
      </div>
    </div>
  );
}

export function FullImage(props: { src: string; alt: string }) {
  return <img class="full-slide-image" src={props.src} alt={props.alt} />;
}

export function Pipeline(props: { steps: string[] }) {
  return (
    <div class="pipeline">
      <For each={props.steps}>
        {(step) => <div class="pipeline-step">{step}</div>}
      </For>
    </div>
  );
}

export function Columns(props: { split?: boolean; children: JSX.Element }) {
  return (
    <div class="columns" classList={{ split: props.split }}>
      {props.children}
    </div>
  );
}

export function Card(props: { title: string; items: string[] }) {
  return (
    <div class="card">
      <h3>{props.title}</h3>
      <Bullets items={props.items} compact />
    </div>
  );
}

export function BoxedText(props: { label: string; children: JSX.Element }) {
  return (
    <div class="boxed">
      <div class="boxed-label">{props.label}</div>
      {props.children}
    </div>
  );
}

export function Impressions(props: { items: string[] }) {
  return (
    <div>
      <div class="boxed-label accent">impressions</div>
      <Bullets items={props.items} compact />
    </div>
  );
}

export function Triangle(props: { nodes: [string, string, string] }) {
  return (
    <div class="triangle">
      <svg viewBox="0 0 100 70" aria-hidden="true">
        <line x1="50" y1="5" x2="13" y2="63" />
        <line x1="50" y1="5" x2="87" y2="63" />
        <line x1="13" y1="63" x2="87" y2="63" />
      </svg>
      <div class="triangle-node a">{props.nodes[0]}</div>
      <div class="triangle-node b">{props.nodes[1]}</div>
      <div class="triangle-node c">{props.nodes[2]}</div>
    </div>
  );
}

export function Systems(props: { rows: [name: string, technique: string][] }) {
  return (
    <div class="systems-list">
      <For each={props.rows}>
        {([name, technique]) => (
          <div class="system-row">
            <div class="system-name">{name}</div>
            <div class="system-tech">{technique}</div>
          </div>
        )}
      </For>
    </div>
  );
}

export function Bio(props: {
  image: string;
  name: string;
  links: readonly (readonly [label: string, href: string])[];
}) {
  return (
    <div class="bio-showcase">
      <svg class="zagrajmy-mark-only" viewBox="0 0 120 120" aria-hidden="true">
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
      <img class="bio-dragon-sheet" src={props.image} alt="" />
      <div class="bio-credits">
        <span class="bio-name">{props.name}</span>
        <For each={props.links}>
          {([label, href]) => (
            <a href={href} target="_blank" rel="noreferrer">
              {label}
            </a>
          )}
        </For>
      </div>
    </div>
  );
}
