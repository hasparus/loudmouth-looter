The index intro, reworked as a tiny dialogue tree.

You're a bounty hunter who's wandered into the looter's camp. He's the mark.
The "about this site" copy gets smuggled in through his bragging, and the scene
ends by handing you the loot — the actual list of posts.

Speakers: **LOOTER** (the edgy alter ego) and **YOU** (the choices).
Each node shows the looter's line(s), then your replies. A node with no replies
is terminal and reveals the post list.

Portraits aren't rendered inline. A small `?` after a line links out to the
image — he only shows his face if you ask for it.

---

## gate — start

> "hey, you there. you seen any outlaws around here?" [?][have-you-seen]

- "you kind of look like one." → **made**
- "nope. no outlaws lately." → **deny**
- "who's asking?" → **whoami**

## made — you call him out

> "ha. takes one to know one."
> "fine, you got me. this is the archive. my edgy, opinionated alter ego: notes,
> rants, kitbashes, experiments. maybe a finished game or two."

- "kitbashes?" → **systems**
- "what's the catch?" → **catch**

_alt opener (pick / replace):_ "shut the door, you're letting the cold in."

## deny — you play dumb

> "good. keep it that way."
> "nothing here but a stash. notes, rants, half-built games i dragged back from
> places i had no business being."

- "back from where?" → **systems**
- "what's the catch?" → **catch**

## whoami — who's asking

> "nobody worth the paperwork. just the author with the manners switched off."

- "fair." → **made**

## systems — the brag (the real "about")

> "i like how systems shape the stories we tell. so i yoink stuff off a dozen
> different games, blabber something incomprehensible about n-dimensional spaces,
> and make my friends play it."
> "they keep asking for more. weirdos."

- "alright, show me." → **loot** (terminal)
- "and if i turn you in?" → **alive**

_alt brag (pick / replace):_ "i don't finish things. i strip them for parts."

## catch — what's the cost

> "no catch. take whatever's worth taking, that's the point."
> "hope you find something worth stealing."

- "show me." → **loot** (terminal)

## alive — you reach for the cuffs

> "ha. your type always thinks it's got a chance." [?][alive]
> "hope you find something worth stealing. but regardless: you won't take me
> alive."

- (he's gone. fire's still warm.) → **loot** (terminal)

## loot — terminal

camp's empty. whatever he left behind is below — help yourself.
→ reveal / scroll to the post list.

[have-you-seen]: https://i.imgur.com/hzKOvy8.jpeg
[alive]:
  https://preview.redd.it/those-looters-really-always-think-they-have-a-chance-v0-gsrkbd1giw881.jpg?width=1080&crop=smart&auto=webp&s=2f19b2866ac7e1d40d94ed456e36d245484b1831

---

## shape — for the Solid build

```ts
type NodeId =
  | "gate" | "made" | "deny" | "whoami"
  | "systems" | "catch" | "alive" | "loot";

interface Choice {
  label: string;
  to: NodeId;
}

interface DialogueNode {
  id: NodeId;
  /** Looter's lines, revealed one at a time. */
  lines: string[];
  /** Optional portrait (the image refs above). */
  portrait?: string;
  /** Absent ⇒ terminal: reveal the post list. */
  choices?: Choice[];
}

type Tree = Record<NodeId, DialogueNode>;
```

Integration notes:

- Replaces the intro `<Paragraph>` in `src/pages/index.astro` with a Solid island
  (`client:idle`). The post `<ul>` stays in the Astro page; the island just gates
  it — terminal node flips a signal / scrolls down to it.
- **No-JS / SSR fallback:** render the plain "about" prose (the `systems` + `catch`
  lines stitched together) inside the island's children so the page still reads as
  an about section before hydration, and for crawlers.
- **prefers-reduced-motion:** skip the typewriter/line-by-line reveal; show each
  node's lines at once.
- Keyboard: choices are buttons; `1..n` select, focus moves to the new node's
  first choice. A "back" affordance can re-walk the visited path (keep a stack).
- Persona keeps the lowercase, dry, slightly-menacing voice. Lines stay short —
  one breath each.

Open questions:

- Loop back, or one-way? (A small visited-stack lets curious readers explore both
  branches without it feeling like a quiz.)
- Does reaching `loot` persist (localStorage) so returning visitors skip straight
  to the posts?
