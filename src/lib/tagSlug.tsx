/** 🇦 — flag emoji are pairs of these; 🇵🇱 slugs as "pl". */
const REGIONAL_A = "🇦".codePointAt(0)!;

/** URL-safe slug for a tag, used by /tags/[tag]. */
export function tagSlug(tag: string): string {
  return tag
    .replaceAll(/\p{Regional_Indicator}/gu, (flag) =>
      String.fromCodePoint(flag.codePointAt(0)! - REGIONAL_A + 97),
    )
    .toLowerCase()
    .trim()
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^a-z0-9-]/g, "");
}
