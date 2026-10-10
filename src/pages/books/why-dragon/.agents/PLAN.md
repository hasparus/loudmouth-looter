# itch.io page plan — Why Would You Fight a Dragon?

Page: https://hasparus.itch.io/why-dragon

## Now

- Default theme: black bg, plain text title, default red button.
- One cover image in the screenshot column; column empty below it.
- Name-your-own-price.
- No devlog, no community, no pull quotes.

## References

| Page | Steal |
|---|---|
| [2400](https://jasontocci.itch.io/2400) | Banner with title baked in, hide text title. Tiled paper texture bg. Full-height screenshot column (every module cover). $6+ with **community copies** reward box. Devlog + community. |
| [Mausritter](https://losing-games.itch.io/mausritter) | Closest match: blackletter logo as banner on plain bg. Bullet list of features with bold lead-ins. Screenshots = photos of the printed book, spreads, filled character sheet. |
| [Wanderhome](https://possumcreekgames.itch.io/wanderhome) | Ornamental logo banner, one-color palette (cream bg, green text/links/button). Awards + pull quote from a known designer at the top. |
| [FIST](https://claymorerpgs.itch.io/fist) | Dark theme done right: stark b/w banner art, monochrome white button, italic blockquote intro setting the mood. Video in screenshot column. |

Anti-references: [Honey Heist](https://gshowitt.itch.io/honey-heist), [Cairn](https://yochaigal.itch.io/cairn), [Lancer](https://massif-press.itch.io/corebook-pdf) — default layout with a bg color swap; reads generic even for famous games.

## Plan

### 1. Pricing

- [x] Edit game → Pricing → Paid, **$5.00**, "Let people pay more".
- [x] More → Rewards → "Community Copies", $0, quantity **47**.
- [x] Reward text: "Not sure you can afford it? Grab a free copy. All gone? Email me at piotr@zagrajmy.net or ping me on Discord (@hasparus) and I'll send you one."
- [ ] Before publishing: verify piotr@zagrajmy.net receives mail from an outside address (Gmail) and replies don't land in spam. Domain has OVH MX + `p=none` DMARC but **no SPF record** — add `v=spf1 include:mx.ovh.com ~all` if replies go from OVH.

### 2. Theme

- [x] BG + BG2 `#300703`, text `#F2EBE7`, IM Fell English.
- [x] Links `#0fcea0`. Buttons `#B3232B` cover red.

Fonts: blackletter-ish header only if itch list has one; body serif (current is fine).

### 3. Hero

itch caps the banner at the 960px column, so the full-width hero is two layers:

- [x] Banner 1920×1200 (shown at 960×600): moon, spires, dragon perched on the title, Rouzeris's original layout.
- [x] Background 2560×600, no-repeat, centred: spires tiled (mirrored) out to both edges, wash strengthened. BG2 alpha 0 so it shows behind the column.
- [ ] Cover image: pick C1/C2/C3, upload via Edit game → Cover image (630×500).
- [ ] Screenshot column still shows the old cover art; replace with spreads/character sheet.

### 4. Screenshot column

Fill it top to bottom:

- [ ] Cover
- [ ] 2–3 interior spreads (from `why-dragon-1-0.pdf`)
- [ ] Character sheet
- [ ] Pyre art (`pyre-1..4.webp`), `dragon.webp`, `dragonsword.png`
- [ ] Hero's Journey diagram
- [ ] Later: photo of a printed copy / table at play

### 5. Copy

Top to bottom:

1. Tagline (keep): *a roleplaying game of violence, change, and sacrifice — for up to 5 people, in 2–4 hours*
2. Three hero lines (keep: Beowulf / Fáfnir / Saint George).
3. Pull quote from a playtester or reviewer (Wanderhome-style).
4. **What's inside** — bullets with bold lead-ins (Mausritter-style):
   - **Pyre** — …Stoke/Burn payoff
   - **Hunters** — …
   - **The Dragon** — …
   - **One-shot** — 2–4 hours, 2–5 players
5. "Not sure you can afford it? Grab a community copy below. The full text is also free to read at lol.haspar.us/books/why-dragon."
6. Credits + licence (keep, move below the fold into "More information" if it crowds).

### 6. Later

- [ ] Devlog post per version (1.0 now, changelog from the web page).
- [ ] Enable community comments.
- [ ] Submit to relevant jams/bundles (visibility; badges show in sidebar).

## Open questions

- Web version stays fully free?
- Pull quote — who?
