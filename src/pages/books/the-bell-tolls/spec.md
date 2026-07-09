# The Bell Tolls — build spec

Handoff for continuing in Opus. Target: a print-ready one-sheet play aid for the
2d10 MÖRK BORG hack. This file is the source of truth; the HTML/PDF is
downstream of it.

---

## 0. Problem to fix

The current bifold prints correctly but interior + back run ~40% empty. Two
levers:

1. **Density** — add the play-critical procedures the sheet is currently missing
   (magic, armor, recovery, death, ability reference).
2. **Type scale** — nudge body up and tighten vertical rhythm so blocks fill
   their panel.

Keep the bifold. Trifold (6 panels) is the fallback _only_ if §4 content
overflows the budget — decide after a full pass, not before.

---\*\*\*\*

## 1. Format & imposition — LOCKED

- A4 landscape, one vertical fold → A5 bifold, 4 panels.
- **Print:** double-sided · short-edge flip · 100% (no fit-to-page) · background
  graphics on.
- **Imposition** (short-edge duplex, no panel rotated):

  | PDF page  | left half          | right half    |
  | --------- | ------------------ | ------------- |
  | 1 · outer | P4 back (odds/ref) | P1 cover      |
  | 2 · inner | P3 combat & magic  | P2 resolution |

  Folded, it opens to **P2 (left) ‖ P3 (right)**. Long-edge flip = inside
  upside-down; ship a long-edge variant only if asked.

- **Render:** Chromium via Playwright —
  `page.pdf(prefer_css_page_size=True, print_background=True, margin=0)` with
  `@page{ size:A4 landscape; margin:0 }`. Fonts base64-embedded as `@font-face`
  so the PDF matches any machine offline. Font TTFs come from the `google/fonts`
  GitHub mirror (gstatic is unreachable in sandbox).

---

## 2. Design tokens

```
--blood  #d6394a     --bone   #e8e2d4     --dim    #8f887a
--ink    #0b0b0d     --gutter #050506     --line   #3a2b2e

Title   UnifrakturCook 700   blackletter, cover only
Head    Pirata One           uppercase, .12em tracking, --blood
Body    EB Garamond 430 / italic

Scale (pt)   h2 21 · h3 12.5 · lead 16 · body 11.5 · fine 8
Panel        148.5×210mm · pad 13/12/12mm · inset keyline 1px --line @7mm
Fold ticks   6mm marks at spine top+bottom, --dim .6
```

Each panel is a black field framed by a thin blood keyline (intentional look
without needing full bleed on a home printer). Never cross the fold with
critical text.

---

## 3. Content schema

Render is a pure function of this. Author content as data, not as markup.

```ts
type BandKey = "miss" | "cost" | "clean";

interface Band {
  key: BandKey;
  range: "≤10" | "11–14" | "15+";
  label: string; // Pirata caps, e.g. "Miss & get hit"
  body: string; // one or two terse sentences
}

interface Note {
  term?: string;
  body: string;
} // term renders as --blood inline lead

interface Procedure {
  id: string;
  title: string; // Pirata head
  lead?: string; // big line, e.g. "Roll 2d10 + ability mod. Read the band."
  bands?: Band[];
  notes?: Note[];
}

interface OddsRow {
  mod: string;
  miss: number;
  cost: number;
  clean: number;
}
interface RefBlock {
  title: string;
  items: string[];
} // dagger list or key:value

type Block =
  | Procedure
  | { kind: "odds"; rows: OddsRow[]; caption: string }
  | RefBlock
  | { kind: "colophon"; lines: string[] };

interface Panel {
  id: "cover" | "resolution" | "combat" | "back";
  blocks: Block[];
}
interface Sheet {
  tokens: Tokens;
  panels: [Panel, Panel, Panel, Panel];
}
```

---

## 4. Panel budget & content plan

| Panel                 | Blocks                                                                                                    | Fill target |
| --------------------- | --------------------------------------------------------------------------------------------------------- | ----------- |
| **P1 cover**          | title · one-line pitch · **core loop** (3 lines) · **what changes vs the book** (4 items)                 | ~85%        |
| **P2 resolution**     | The Roll + bands · When to roll · **Ability mods** ref · **Omens**                                        | full        |
| **P3 combat & magic** | Fighting + bands · Harm · **Armor** · Adv/Disadv · **Scrolls (cast)**                                     | full        |
| **P4 back**           | Odds table + caption · **Rest & recovery** · **Broken / death** · **What stays from the book** · colophon | full        |

**New blocks to write (fill material):**

- **Cover pitch seed** — advertise to PbtA MCs while staying in MÖRK BORG's
  vibe: play on "Masters of Ceremonies spawned by the Apocalypse" — the MC is
  PbtA's GM, and MÖRK BORG is _literally_ an apocalypse. Reads straight to a MB
  reader, as an in-joke to a PbtA one. Voice the final line later.
- **Tone brief — doom at power-metal tempo.** The usual MÖRK BORG doom, faster.
  Keep the crushing riff; raise the BPM. Doom supplies the dread (45% failure at
  +0, full harm on a trade, no safe build); power metal supplies the gallop
  (one roll per exchange, no armor die, no DR lookup, the GM never rolls) and the
  solo (the natural-end crit). Grim, but it never drags.
- **Core loop (cover)** — three lines: _Say what you do. If it's in doubt and
  can bite, roll 2d10 + mod. Read the band and live with it._
- **What changes vs the book** — d20-vs-DR becomes 2d10 bands; DR/target numbers
  are gone; everything else stays.
- **Ability mods** — Agility / Presence / Strength / Toughness, each −3…+3; note
  what each governs in one clause.
- **Omens** — DECIDE §5; render as a short spend-list once verbs are chosen.
- **Armor** — DECIDE §5.
- **Scrolls** — cast = 2d10 + Presence; ≤10 misfire (book's powers), 11–14 it
  works but bites, 15+ clean. Confirm the 11–14 wording.
- **Rest & recovery** — DECIDE §5 (keep book vs reband).
- **Broken / death** — at 0 HP, roll the Broken table as written (d6). Only the
  resolution die changed; the table stays.
- **What stays from the book** — scvm, classes, gear, scrolls, Broken, Omens,
  bestiary, every random table. Only the dice change.

---

## 5. Open design decisions — resolve first, they gate the copy

> Superseded by **§9**, which resolves these. Two items stay open (Broken
> lethality, armor soak flavor). Kept for the reasoning trail.

1. **Armor.** Book reduces damage by −d2/d4/d6. Monsters don't roll here, so
   pick one model:
   - (a) **band downgrade** — armor drops an incoming hit one band (clean→trade,
     trade→miss&hit);
   - (b) **flat soak** — subtract fixed HP per tier;
   - (c) **disadvantage floor** — heavier armor, not the hit, sets your
     keep-lowest baseline. Leaning (a): it's die-free and matches the band
     grammar.
2. **Omens.** Spend 1 to → reroll the 2d10 / bump one band up / negate a wound?
   Pick the verbs; keep it to two or three.
3. **Scroll cast banding.** Confirm 11–14 for magic ("it works, but the scroll
   takes something" vs "cast at reduced effect").
4. **Rest.** Keep the book's get-better roll, or reband recovery to a 2d10 test?
   Consistency vs. compatibility.

---

## 6. Locked copy — reuse verbatim, do not rewrite

**Resolution bands (2d10 + mod):**

- `≤10` — **You fail.** Something bad happens and the world moves against you.
- `11–14` — **Cost.** You do it, but the situation bites back — a price, a
  complication, a piece of you left behind.
- `15+` — **Clean.** You do it. No strings.

**When to roll:**

- Only when the outcome is in doubt and failure has teeth.
- Difficulty is framing. Zoom in, change the stakes or the fiction. Leave the
  number alone. _(audited per §9: "split the task" was task-resolution
  language)_
- Impossible stays impossible until the plan changes.

**Combat** — _Monsters don't roll. One 2d10 + mod settles the exchange._

- `≤10` — **Miss & get hit.** Your blow fails, theirs lands. Take the wound.
- `11–14` — **Trade blows.** You both connect. Deal your harm, take some back.
- `15+` — **Clean hit.** You land it. They don't touch you.

**Harm** — No bare numbers. The wound is described in the fiction, then HP
drops. A number alone is never the consequence.

**Swing the odds** — _Disadvantage_ (hurt, blind, cornered, bleeding): roll
3d10, keep the lowest two — this is how Haemorrhage and its kin work, no rising
DR to track. _Advantage_ (set up, flanking, right tool): roll 3d10, keep the
highest two.

**Odds table** (verified, `≤10 / 11–14 / 15+`):

| mod | fail | cost | clean |
| --- | ---- | ---- | ----- |
| −3  | 72%  | 22%  | 6%    |
| −2  | 64%  | 26%  | 10%   |
| −1  | 55%  | 30%  | 15%   |
| +0  | 45%  | 34%  | 21%   |
| +1  | 36%  | 36%  | 28%   |
| +2  | 28%  | 36%  | 36%   |
| +3  | 21%  | 34%  | 45%   |

Caption: _2d10 runs flatter than 2d6. The tails are fat — a good mod swings
hard, a bad one damns you. At +0 you fail nearly half the time. Nobody is safe._

**Voice rules** (carry into all new copy): no antithesis ("not X, it's Y"), no
rule-of-three, no signposting before tables, no GM-as-agent framing ("something
bad happens," never "the GM does X to you"), never "pay" as a band name.

---

## 7. Build recipe (reproduce the render)

1. Fetch TTFs from
   `raw.githubusercontent.com/google/fonts/main/ofl/{unifrakturcook,pirataone,ebgaramond}`;
   base64 into `@font-face`.
2. Emit two `.page` divs (297×210mm each) split into two `.panel` (148.5mm), in
   the §1 imposed order.
3. Screen-only proofing chrome (fold line, panel labels, print-settings banner)
   behind `@media screen`; hidden in `@media print`.
4. Playwright Chromium → `emulate_media('print')`, await `document.fonts.ready`,
   `page.pdf(...)` as §1.
5. Verify: 2 pages, mediabox 841.9×595.0pt (297×210mm). Rasterize with
   `pdftoppm -r 110` and eyeball both sides.

---

## 8. Source data — reference only (do not reprint)

From `.context/` PDFs (MB Rules Reference, Bare Bones, character sheet, /hack).
The sheet's copy must stay numerically consistent with these; none get
reprinted.

**Ability → governs** (rules ref):

- Agility — defend, balance, swim, flee
- Presence — perceive, aim, charm, wield Powers (Powers/day = Presence + d4)
- Strength — crush, lift, strike, grapple
- Toughness — resist poison/cold/heat, survive falling; HP base

**DR ladder** (removed — the bands replace it): 6 simple · 8 routine · 10 pretty
simple · **12 normal (default)** · 14 difficult · 16 really hard · 18
impossible. DR12 = normal is why +0 fails ~half.

**Armor tiers** (book): Armor 1 −d2 · Armor 2 −d4 (+2 DR Agility) · Armor 3 −d6
(+4 DR Agility, +2 DR Defence). Two-sided: soak plus an Agility tax.

**Broken table** (book, d4 at 0 HP): 1 unconscious d4 rounds, wake d4 HP · 2 limb
broken/severed (d6: 6 = lost eye), out d4 rounds, d4 HP · 3 Haemorrhage, dead in
d2 hrs unless treated (DR16 first hour, DR18 last) · 4 dead.

**Rest** (book): catch breath → d4 HP · night's sleep → d6 HP · Infection → no
healing, d6 dmg/day.

**Scrolls** (book): wield = Presence DR12; fail → power fails, d2 damage, dizzy 1
hr no Powers. Uses/day = Presence + d4.

**Omens** (book menu): start d2 classless, regain d2 after 6h rest. Spend to: ①
max damage · ② reroll a die · ③ −d6 damage to you · ④ neutralize a Crit/Fumble ·
⑤ −4 to a test's DR.

**Crit/Fumble** (book): nat 20 = ×2 dmg + armor −1 tier (atk) / free attack
(def). nat 1 = weapon breaks (atk) / double damage, armor −1 tier (def).

**Stays 2d6, not 2d10** (GM-side, not resolution rolls): Reaction (2d6), Morale
(2d6). "Only the dice change" scopes to _player resolution_ — say so.

**Untouched subsystems** (already free of d20/DR): Getting Better (6d10 vs max HP
→ +d6; d6 vs each ability → +1). Initiative (book: Agility + d6) — currently
omitted from the sheet.

**/hack** (Walton Wood) — sibling 3PL hack, opposite axis (removes to-hit, rolls
weapon-die vs armor-die, keeps crit/fumble tables). Contrast only, nothing
lifted.

---

## 9. Resolved decisions (supersedes §5)

**Resolution scale: scene, not task.** A roll settles a whole scene or conflict,
not one discrete action. The bands describe scene-level outcomes — "read the
band and live with it" is the fate of the beat, not one swing. Consequence: far
fewer rolls, each carrying real stakes. AUDIT the §6 _When to roll_ copy — "zoom
in, split the task" is task-resolution language and fights this; reframe toward
re-scoping the scene / changing the stakes. **Combat scope:** one `2d10` per
exchange — but an exchange _can_ settle the whole fight when it ends in a death
or a flight. The band is the beat; the fiction decides if that beat closes the
scene.

**DR — removed everywhere.** No target numbers anywhere. Every former DR test
becomes `2d10 + mod`, read the band. Broken's DR16/18 and scroll DR12 dissolve
into the bands below.

**No defence roll.** Monsters never roll. The single `2d10 + mod` exchange is the
_attacker's_: Strength (melee) / Presence (ranged). Agility never defends in
combat.

**Ability map (final):**

- Strength — crush/lift/strike/grapple → melee exchange
- Presence — perceive/aim/charm/scrolls → ranged exchange, scroll cast
- Agility — dodge/flee/balance/climb/swim → escape & evasion tests (e.g. flee an
  AoE: `2d10 + Agility`); **and the exchange when you fight nimbly** (see below)
- Toughness — resist poison/cold/heat, survive falls → endurance tests; sets HP
  (Toughness + d8)

**Combat stat — roll what fits the fight (LEAN, fixes the Agility gap).** Deleting
Agility-from-defence left it combat-dead and made a strong/clumsy brute _strictly
safer_ than an agile/fragile skirmisher (§10 build redistribution) — the brute
rolls every fight on their good stat and never risks the bad one, while the
skirmisher fights on their weak Strength and their Agility only helps them run.
Fix: the exchange is rolled with the stat matching _how_ you fight —

- **Strength** — overpower, grapple, heavy weapons
- **Agility** — outmaneuver, skirmish, light/finesse weapons, open ground
- **Presence** — command, aim, ranged

Fiction gates which applies (no finessing a foe who has you pinned). Restores
Agility as an offensive stat, gives every build a combat identity, and deepens
the fiction-first ethos — "say how you fight, roll the stat that fits." Ceiling:
players reach for their best stat; the GM's fiction gate is the check. Concrete
fallback if too loose: bind stat to weapon (heavy → STR, finesse → AGI, ranged →
PRE). This supersedes the "Strength/Presence only" combat column above. DECIDE.

**Trade blows (`11–14`) deals full harm** — the PC takes the monster's whole
wound, reduced by armor, same as a Miss. RESOLVED. This is the lethality dial
(§10): full harm on both ≤10 and 11–14 makes the hack ~1.2× deadlier than RAW per
fight, not merely per round — deliberate. (§6 locked copy "take some back" reads
as the full wound; reword at voice pass if it misleads.)

**Advantage & Disadvantage — 3d10, keep two. RESOLVED.**

- **Advantage** (set up, flanking, the right tool) — roll `3d10`, keep the
  **highest** two.
- **Disadvantage** (hurt, blind, cornered, bleeding) — roll `3d10`, keep the
  **lowest** two.

_They are worth ±3 — the whole span of ability mods._ Advantage at +0 plays almost
exactly like a normal roll at +3; disadvantage at +0 like a normal roll at −3:

| mod | normal (fail/cost/clean) | advantage        | disadvantage     |
| --- | ------------------------ | ---------------- | ---------------- |
| −3  | 72 / 22 / 6              | 47 / 38 / 15     | 89 / 10 / 1      |
| −2  | 64 / 26 / 10             | 38 / 39 / 23     | 85 / 13 / 2      |
| −1  | 55 / 30 / 15             | 29 / 38 / 33     | 78 / 17 / 4      |
| +0  | **45 / 34 / 21**         | **22 / 36 / 43** | **71 / 22 / 7**  |
| +1  | 36 / 36 / 28             | 15 / 32 / 53     | 62 / 27 / 11     |
| +2  | 28 / 36 / 36             | 11 / 27 / 62     | 53 / 32 / 15     |
| +3  | 21 / 34 / 45             | 7 / 22 / 71      | 43 / 36 / 22     |

This is why Heavy armor's Agility disadvantage is a real tax, and why granting
advantage is a real gift. Do not hand either out casually.

**Ruling — the natural ends read the _kept_ pair.** The two dice you keep are the
roll. So advantage and disadvantage move the crit and fumble rates too:

| Roll         | crit (nat `≥19`) | fumble (nat `≤3`) |
| ------------ | ---------------- | ----------------- |
| normal       | 3.0%             | 3.0%              |
| advantage    | **7.9%**         | 0.4%              |
| disadvantage | 0.4%             | **7.9%**          |

A haemorrhaging character — disadvantage on everything — fumbles at 7.9%, 2.6×
normal, and crits almost never. Bleeding out makes you a disaster. The §6 locked
copy already said as much: _"this is how Haemorrhage and its kin work."_

**Ruling — they never stack.** Any number of advantages is one advantage. One
advantage and one disadvantage cancel to a normal roll.

**Damage — flat, no dice. RESOLVED.**

- A hit deals the weapon's **maximum** (d4 → 4, d6 → 6, d8 → 8, d10 → 10). Read
  it straight off the book's weapon list; no translation table needed.
- **Armor removes 1 / 2 / 3** (Light / Medium / Heavy). Keep these numbers — the
  book's armor _die maxima_ (2/4/6) would nullify combat: a d6 sword vs Heavy
  would deal exactly 0, forever, and most of the bestiary (d4–d6) could not
  scratch a Heavy-armored PC. At 1/2/3 the only nullification is unarmed (2) vs
  Heavy — which is the one you want.
- **No damage dice anywhere.** Not on a hit, not on a crit. The only dice in a
  fight are the one `2d10`; everything else is subtraction.

_Why this works._ Both sides scale by the same factor, so per-fight lethality is
unchanged while fights get ~40% shorter. Monster at 8 HP, PC lands on 55% of
exchanges: **before** — deal E=3.5 → 1.93/exchange → 4.16 exchanges to kill; lose
2.77/exchange × 4.16 = **11.5 HP/fight**. **After** — deal 6 → 3.3/exchange → 2.42
exchanges; lose 4.74 × 2.42 = **11.5 HP/fight.** Identical. Same doom, faster —
the tone brief (§4) as arithmetic.

**Broken — keep the book's d4 table; reband only what was a DR test. RESOLVED.**

**0 HP _or below_ → roll the book's d4 Broken table.** RAW's "negative HP: dead"
is **dropped**. Under flat damage the overkill is deterministic — a 4 HP character
struck for 6 goes to −2 the same way every time, so "negative = dead" would delete
the Broken table from the game entirely.

**The table**, roll `d4`:

- **1 — Out cold.** You drop. You take no further part in the fight. You come
  round at **d4 HP** when it is over, or when a companion rouses you.
- **2 — Maimed.** Broken or severed limb (`d6`: **6** = lost eye). Out of the
  fight; you come round at **d4 HP**. The maiming is permanent.
- **3–4 — Haemorrhage.** You are bleeding out. See below.

_Two departures from the book, both deliberate:_

**No rounds.** RAW's "unconscious for d4 rounds" has no unit here — scene
resolution has no rounds to count. You are simply **out of the fight**; the scene
decides when you come back, not a counter.

**No "Dead" slot.** RAW's rung 4 is instant death. Here it becomes a second
Haemorrhage, so **you never die outright — you die bleeding, while someone tries
to reach you.** Rungs 1–2 still put you back on your feet at d4 HP: Broken is a
downward spiral, not removal. That is the engine of dread; leave it.

**Haemorrhage (rungs 3–4).** You are bleeding out.

- **Every roll you make is at disadvantage** (3d10, keep the lowest two) — which
  also means you fumble at **7.9%** and crit at **0.4%**. Dying makes you a
  disaster.
- **Roll `d2`. That is your clock.** It is counted in **your own rolls** while
  something presses you, or in **hours** while nothing does. When it runs out,
  you die.
- **Lying still costs nothing.** No roll, no tick. Your friends have as long as
  the fiction gives them. The moment you must act — crawl, defend, escape a
  monster coming to finish you — the count runs.
- **Treatment stops it**, in the fiction. There is no save to roll.

_Why the clock counts your rolls._ The book measured haemorrhage in hours and
escalated its difficulty (DR16 → DR18). We have no rounds and one difficulty
lever, so the clock attaches to the only unit this game has: the roll you make.
Doing nothing is safe; doing something might kill you. That is the exact shape of
lying wounded on a battlefield, and it costs one sentence.

_Note:_ RAW's DR16/DR18 was **not** a death save — it was a global penalty on all
tests plus a pure timer. Disadvantage-on-everything is its faithful deband.

**Morale — keep the book (2d6 vs Morale score). RESOLVED.** "Monsters don't roll"
governs the combat exchange; Morale is a GM-side reaction check, so the GM rolls
it. Unchanged from the book: roll 2d6 over the creature's Morale score → it
breaks; then d6, 1–3 flees, 4–6 surrenders.

_When the GM rolls it:_ at the end of any exchange in which a trigger **first
becomes true** — once per trigger, per fight. Not every round. The blow lands and
resolves, then the survivors decide whether they are still in this. Triggers stay
the book's:

- the leader is killed
- half the group is eliminated
- a lone enemy drops to 1/3 HP

_Who never checks:_ creatures with no Morale score in the bestiary — mindless
things, undead, demons. They fight until destroyed. A statblock fact, not a roll.

_The Clean band is not a fourth trigger._ A `15+` is the fiction that fires a
trigger (it is how the leader dies cleanly), not a rule of its own — make it a
trigger and Morale would be rolled on 21% of exchanges. This is what makes "an
exchange can settle the whole fight" precise: the exchange kills the leader →
Morale fires → they break → the fight is over.

Why keep 2d6 rather than reband to 2d10 bands: **the bestiary prints a Morale
score for every creature.** Rebanding orphans that number in every statblock, and
the hack's promise is that the book's monsters and tables keep working. Morale —
like Reaction (§8) — is a GM-side creature stat, not player resolution. This is
the one surviving 2d6 and the one surviving target number in the system; that is
the accepted price of bestiary compatibility. Scope the slogan accordingly: _only
the player's dice change._

_Precision:_ this is not the GM's only die. The GM also rolls Reaction (2d6, first
contact) and every random table. The pillar is narrower: **monsters never roll to
hit or defend.**

**Crit & Fumble — natural ends, symmetric. RESOLVED.**

Triggers read on the **natural** dice (before mods), like the book's. **3% each.**

- **Crit — natural `≥19`** → **shred the target's armor one tier**, then **double
  the damage**.
- **Fumble — natural `≤3`** → the mirror: **your own armor shreds one tier**, then
  the damage to you is **doubled**.

No weapon break — situational, left to GM discretion. "Armor down one tier" ports
untouched: Heavy → Medium → Light → none.

_This is the book, verbatim._ RAW's crit is "×2 damage, armor/protection reduced
one tier"; RAW's defence-fumble is "double damage, armor reduced one tier." With
flat damage there is nothing to explode and nothing to reroll — doubling _is_ the
rule, and it was the book's rule all along. Only the **trigger** differs (natural
`≥19`/`≤3` instead of nat 20/nat 1), because we fused attack and defence into one
roll.

_Why natural, not modified totals._ Crit/fumble read the raw dice, so a +3 still
fumbles and a −3 still crits. The **bands already carry the modifier** (Clean goes
21% → 45% from +0 to +3); the **natural ends carry the cruelty**. Splitting the
labor keeps both halves of the locked copy true — "a good mod swings hard" _and_
"nobody is safe." See §11 for the symmetric alternative we rejected.

_Band consistency holds._ At −3, natural 19 → total 16, still Clean. At +3,
natural 3 → total 6, still a Miss. So **a crit is always a Clean hit and a fumble
always a Miss**, at every legal mod, by construction.

_Emergent property worth keeping:_ at −3 the Clean band is natural 18+, so **half
of a doomed character's clean hits are crits.** The underdog's rare good swing
tends to be devastating. Mirror at +3: misses are rare, but a large share of them
are catastrophes. Power metal in one corner, doom metal in the other.

_Where this came from._ The book's crit/fumble is a 2×2 — the player rolls both
attack and defence, so: attack-crit (×2 dmg, strip target armor) · attack-fumble
(weapon breaks) · defence-crit (free attack) · defence-fumble (×2 damage taken,
your armor stripped). Deleting the defence roll orphaned the bottom row. Our
single roll fuses attack and defence, so the natural ends fuse the cells: crit
takes the attack-crit, fumble takes the defence-fumble. The defence-crit's free
attack is redundant (a Clean band already means they never touch you) and the
weapon break is dropped.

_Two rulings this needs:_

1. **Order of operations — shred, subtract, then double.** Apply the armor shred
   first, subtract the _new_ tier, and double last. A d6 weapon into Heavy armor:
   normally `6 − 3 = 3`; on a crit, Heavy → Medium, so `(6 − 2) × 2 = 8`. This
   keeps a crit **strictly better than a normal hit**, always. Same rule for
   halving (Omens): armor first, then modify. Round down.
2. **Armor shred persists** until repaired or replaced. This is what gives the
   fumble teeth, and hands us a gear economy for free.

_Knock-on:_ **the scroll fumble table gets a home.** Natural `≤3` on a cast → roll
the book's p.44 fumble table (nastier for unclean scrolls). Another book table
kept alive at zero cost, and casting becomes feared.

**Omens — 3-verb menu** (economy unchanged: start d2, regain d2 after 6h rest).
Spend 1 to:

- **treat this hit as a crit** (shred their armor a tier, double the damage)
- **halve the damage dealt to you**
- **bump one band up** (`≤10→11–14`, or `11–14→15+`)

_How the book's five collapsed:_ ① "deal max damage" is reborn as **treat this hit
as a crit** (under flat damage you already always deal max, so the old verb was a
no-op). ③ "lower damage by d6" becomes **halve** — dice-free, and it scales with
the wound. ⑤ "−4 DR" becomes **bump one band up**. ② "reroll a die" and ④
"neutralize a Crit/Fumble" are **dropped**.

**Ruling — natural ends are read on the natural dice; nothing on this menu touches
them.** Bump a Miss up to Cost and you are still holding a natural `≤3` — still
fumbling, still shredding your armor. With the reroll gone, **no Omen undoes a
fumble.** You can halve its wound; you cannot unmake it. That is the harsher and
more MÖRK BORG reading: fate is not rewritten, only survived.

(Book ④ also negated a _monster's_ crit against you. There is no monster roll here
— the monster's spike **is** your fumble — so ④ has nothing to negate.)

_Ruling:_ **armor first, then halve, round down** — the same order-of-operations as
a crit's doubling (§ Crit & Fumble). A crit's doubling and an Omen's halving
cancel exactly.

**Scrolls — cast = `2d10 + Presence`**, read the band:

- `≤10` — **Misfire.** Power fails, take d2 damage, dizzy — no scrolls for an
  hour.
- `11–14` — **It works, but the scroll takes something.** Pay: a wound, an Omen,
  or the scroll crumbles.
- `15+` — **Clean.** It works, no cost.

Uses/day = Presence + d4 (unchanged — an economy, not a roll).

**Armor — removes damage, three tiers.** Named Light / Medium / Heavy, matching
the book:

- **Light** — remove 1 damage. Nimble: advantage on Agility rolls.
- **Medium** — remove 2 damage.
- **Heavy** — remove 3 damage. Disadvantage on Agility rolls (flee, climb,
  dodge).

Flat and roll-less — no die to soak. This resolves the old "heavy armor is all
cost" gap: the payoff is the soak, the tax is the Agility disadvantage.

### Still open (gate copy)

1. **Combat stat** — roll-what-fits (lean) / weapon-bound / Strength-only. See §9.

---

## 10. Deadliness vs RAW — analysis findings

Three independent analysts (2 computing each system, 1 head-to-head) read the OG
book and the spec. Converged result:

**Per round: ~1.4× deadlier than RAW, robustly.** Driver: RAW spends two d20s a
round (attack DR12 + defence DR12) and the PC bleeds only on a failed defence
(**55%** at +0). The Bell Tolls fuses both into one 2d10; the PC bleeds on any
band ≤14 (**79%** at +0). Stable across mods: −2 → 90 vs 65%, +2 → 64 vs 45%.
Armor compounds it — flat −1/−2/−3 (avg 1/2/3) soaks less than the book's dice
−d2/d4/d6 (avg 1.5/2.5/3.5).

**Per fight/campaign: within ~15%, sign can flip.** Two hack choices push back:

- **Faster kills** — PC lands harm on 55% of exchanges (Cost+Clean) vs RAW's 45%
  attack success → shorter fights, less exposure.
- **No instant death at all.** RAW kills outright on any overkill ("negative HP:
  dead") _and_ on Broken rung 4 (flat 25%). We route **0 or below** into the d4
  table, and rung 4 became a second Haemorrhage. **You never die outright — you
  die bleeding, while someone tries to reach you.** Death now requires: drop to 0,
  roll 3–4 (50%), then run out of a `d2` clock while pressed or untreated.
  Strictly gentler than RAW at the moment you fall — and dying is nastier while it
  lasts, since disadvantage-on-everything means you fumble at 7.9%.

**Flat damage changed the tempo, not the toll** (§9). Both sides scale by the same
factor: PC loses **11.5 HP per fight** before and after, while fights run ~40%
shorter. Deadlier per _round_, identical per _fight_, and much faster. Note this
supersedes the analysts' assumption of E[wound]=3.5 — wounds are now the weapon's
max, and armor soaks flat.

**Swing variable resolved: trade blows deals full harm** (§9). That lands the
verdict on the deadlier side at every scale — ~1.2× per fight, ~1.4× per round.

**Build redistribution.** Deleting Agility-from-defence makes a strong/clumsy
bruiser _safer_ than in RAW and an agile/fragile skirmisher _deadlier_ — the hack
moves risk onto the attack stat.

Assumptions: monster damage d6 (avg 3.5), one wound per harmful band, HP =
Toughness + d8. Ratios hold under other damage dice; absolute HP scales linearly
with wound size.

---

## 11. Blog post notes — design diary

Raw notes for a "designing The Bell Tolls" post. Not final prose; voice later.

**Working thesis.** MÖRK BORG's doom is a d20 flatline — every roll a coin-flip
against a static wall. Swap the engine for `2d10 + mod` read as three bands and
doom gets a _shape_: a bell curve with fat tails, a middle band that makes
success sting, mods that swing hard. Same corpse, new heartbeat.

**Angles worth a section each:**

- **Why 2d10, not d20 or 2d6.** d20 is memoryless — DR is a wall, every roll a
  coin-flip. 2d6 (PbtA) curves but caps at 12, thin tails. 2d10 keeps a real
  curve _and_ fat tails: +3 genuinely tilts fate, −3 damns you, +0 fails ~half.
  Lead with the odds table.
- **Success with a cost, on a curve.** The 11–14 band is PbtA's 7–9 mixed
  success earned on a bell curve, not a flat 2d6. It's where the game lives (34%
  at +0). "You do it, but it bites."
- **Monsters don't roll.** One 2d10 settles the exchange; the GM never touches a
  die in a fight. Scene, not task, resolution. Name the lineage (below).
- **It's deadlier — and we say so.** ~1.4× per round (79% vs 55% harm), ~1.2× per
  fight, because attack+defence fold into one roll and you bleed on any band ≤14.
  "Nobody is safe" is the math, not marketing.
- **The counterintuitive twist: you can't die outright.** RAW kills on overkill
  and on a flat 25% table slot — and once damage is flat, overkill is
  _deterministic_, so RAW's rule would silently delete the Broken table. We route
  0-or-below into the table and turned the "Dead" slot into a second Haemorrhage.
  **Nobody dies instantly; they die bleeding while someone tries to reach them.**
  More lethal per round, less fatal at the moment you drop, and far more dramatic
  in between. Good beat.
- **The clock that only ticks when you move.** Haemorrhage counts _your rolls_,
  not rounds — a scene-resolution game has no rounds. Lie still and nothing
  happens; your friends have as long as the fiction gives them. Act — crawl,
  defend, escape the thing coming to finish you — and the count runs. One
  sentence, and it's the exact shape of lying wounded on a battlefield.
- **Advantage is worth +3.** We measured it: advantage at +0 plays like a normal
  roll at +3, disadvantage like −3. It also triples your crit rate (3% → 7.9%) and
  nearly deletes your fumbles. So a bleeding character — disadvantage on
  everything — fumbles at 7.9%, and the death spiral is mechanical, not narrated.
- **We deleted the damage die and lethality didn't move.** Weapons deal their max,
  armor removes 1/2/3, and both sides scale together: 11.5 HP lost per fight
  before and after, fights ~40% shorter. The whole change bought tempo and cost
  nothing. Show the arithmetic — it's the most surprising result in the project.
- **The book had the answer already.** We invented exploding dice for crits, then
  found RAW's crit is "×2 damage, armor reduced one tier" — exactly what flat
  damage wanted. The hack kept arriving back at the book's own text.
- **The imbalance we had to fix.** Benching Agility from defence made the
  strong/clumsy brute strictly safer than the agile/fragile skirmisher. Fix:
  roll the stat that fits the fight, so Agility fights back. A found-and-fixed
  emergent bug — prime diary content.
- **Armor without dice.** Flat 1/2/3, the tradeoff moved into advantage/
  disadvantage. Why we dropped the soak die — and why the book's die _maxima_
  (2/4/6) would have made a sword unable to hurt a knight.
- **Doom at power-metal tempo.** Count the dice. A RAW round spends **two d20s**
  (your attack, then your defence), a weapon die, an armor die, and a DR lookup.
  An exchange here spends **one 2d10** and a subtraction. The GM rolls nothing.
  Same crushing riff, twice the BPM. The doom is in the odds (45% failure at +0,
  full harm on a trade, no safe build); the speed is in the procedure.
- **The crit you already have.** A nat 20 is 5%; natural 19+ on 2d10 is 3%. Looks
  like a loss — until you notice the Clean band fires at 21%, four times more
  often than a nat 20, and Miss-&-get-hit at 45%, nine times a nat 1. The bands
  ate the crit and the fumble. What's left for the natural ends is the pure spike.
- **The symmetry we turned down.** Trigger crits on the _modified_ total and you
  get a perfect mirror: P(crit at +k) = P(fumble at −k), 21% down to 0%. Gorgeous
  — and it makes a +3 incapable of catastrophe and a −3 incapable of glory. Two
  hard zeros, and the first one breaks the thesis we'd already locked: _nobody is
  safe._ Natural triggers split the labor instead — the bands carry the modifier,
  the natural ends carry the cruelty. A story about rejecting an elegant idea
  because it contradicted a sentence.
- **The one die we didn't touch.** Morale stays 2d6-vs-a-score — the last target
  number in the game — because the bestiary prints a Morale score for every
  creature and rebanding would orphan it. Compatibility beat purity. Sharpened
  the slogan: _only the player's dice change._

**Prior-art positioning** (from the research pass — use to place the hack and
show it's novel):

- **Novel enough to publish.** No published work fuses all four axes — 2d10 bell
  curve + fixed cost bands (no DR) + scene resolution + monsters-never-roll — onto
  MÖRK BORG. The name "Mork World" is unused.
- **The one to name-check: Sölitary Defilement** (1d10+5, `1d105.itch.io`) —
  independently put Strong/Weak/Fail bands on MÖRK BORG, but keeps DR target
  numbers, uses 2d20 count-successes (not a summed curve), keeps normal MB combat.
  Cite it, then mark the split: we discard DR, sum a real bell curve, resolve
  scenes, settle combat in one player roll.
- **Spiritual model: Ironsworn** (Tomkin) — the origin of "d10s + three bands +
  success-with-cost + no opposing roll." The Bell Tolls is Ironsworn's outcome
  grammar as a 2d10 sum, dropped into MÖRK BORG.
- **Combat lineage: Into the Odd / Cairn / /hack / Murkdice's Borg→Cairn** —
  "monsters don't roll, armor is flat DR." Our combat axis is this family.
- **Bell-curve precedent: BITS of Mörk Borg** (2d6, player-facing) and forum 2d10
  rescales of PbtA odds — the dice math is well-trodden; the _combination_ on
  MÖRK BORG is the new thing.

**"Why not just play Into the Odd / Cairn?"** — the sharpest objection, own it in
its own section. The combat lineage is the same family (monsters don't roll,
armor is flat damage reduction), and Murkdice already published a Borg→Cairn
conversion. Answer, in order:

- **Same disease, different diagnosis.** Both games agree d20-vs-DR to-hit is a
  boring coin-flip. Into the Odd deletes the roll — attacks auto-hit, you roll
  damage. We keep the roll and make it say _three_ things instead of two. Cairn
  removes the question; we rewrite the answer.
- **Cairn has no mixed success.** Hit, roll damage, attrition. There is no "you do
  it, but it bites." The cost band is the whole heart of The Bell Tolls and it has
  no analog in Into the Odd. Cairn's drama is _attrition_ (HP as hit protection,
  damage bleeding into STR); ours is _consequence_. Different engines of dread.
- **The die is where the player decides.** Under auto-hit, the player's roll is a
  damage roll — no reading, no agency, a formality after the choice. Our one roll
  _is_ the decision point: read the band, live with it.
- **You want MÖRK BORG, not a conversion out of it.** Converting to Cairn takes
  you out of the scvm, the classes, the gear, the scrolls, the Omens, the Broken
  table, the bestiary, every random table — and the doom-metal apocalypse and its
  voice. This is a hack, not an exit. Everything of the book survives; only the
  player's dice change.
- **Task vs scene.** Cairn still resolves tasks — this attack, this save. We
  resolve scenes. That's the PbtA graft, and Cairn never asked for it.
- **The honest concession.** If you want dice-light, no-to-hit, fast combat, Into
  the Odd or Cairn is the better tool, and /hack does the same trick natively
  inside MÖRK BORG. We cost you one roll per exchange. The trade: that roll
  _means_ something.

**Open threads to be honest about in the post:** crit/fumble burst, combat-stat
looseness.

# Legal

We must include this disclaimer:

> [Product name] is an independent production by [Author or Publisher] and is
> not affiliated with Ockult Örtmästare Games or Stockholm Kartell. It is
> published under the MÖRK BORG Third Party License.

> MÖRK BORG is copyright Ockult Örtmästare Games and Stockholm Kartell.

We must also include the Compatible with Mork Borg logo.
