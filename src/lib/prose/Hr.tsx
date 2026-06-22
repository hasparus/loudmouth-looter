/**
 * Ornamental rule for `---` in prose — a hairline broken by a floral heart.
 * No interaction, so Astro renders it statically (no island). The gap between
 * the flex segments makes the break, so no background masking is needed.
 */
export default function Hr() {
  return (
    <div
      role="separator"
      class="my-10 flex items-center gap-3 text-neu-400 dark:text-neu-500"
    >
      <span class="bg-neu-200 dark:bg-neu-800 h-px flex-1" />
      <span aria-hidden class="leading-none">
        ❦
      </span>
      <span class="bg-neu-200 dark:bg-neu-800 h-px flex-1" />
    </div>
  );
}
