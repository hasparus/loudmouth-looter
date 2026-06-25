// Astro resolves `.astro` imports through its language-server plugin, which is
// what `astro check` uses. Plain `tsc --noEmit` (run as a separate typecheck
// step) has no such resolver, so it needs this ambient fallback to type a
// `.astro` import as a component — used by `src/lib/mdxComponents.ts`, which is
// the only non-`.astro` module that imports `.astro` files directly.
declare module "*.astro" {
  const component: (props: Record<string, unknown>) => unknown;
  export default component;
}
