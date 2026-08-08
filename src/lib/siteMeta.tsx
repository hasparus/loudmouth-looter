/**
 * Override these per-site. Consumed by BaseLayout (JSON-LD WebSite),
 * llms.txt, and llms-full.txt. Consumers may extend this module with
 * an AUTHOR and thread it through PostLayout / rss.
 */
export const SITE_NAME = "loudmouth looter";
export const SITE_BLURB = "rants, mechanics and kitbashes";

/**
 * Fallback og:image for pages that don't bring their own (home, tags, 404).
 * Posts override it — see `resolvePostOgImage`. Carries no lettering on
 * purpose: og:title and og:description supply the words, so the art doesn't
 * go stale when a page is retitled. Lives in `public/`, so the path is the
 * filename — swap both together.
 */
export const SITE_OG_IMAGE = "/og-default.jpg";
