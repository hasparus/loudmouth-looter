/**
 * Ornamental rule for `---` in prose — a hairline broken by a floral heart.
 * No interaction, so Astro renders it statically (no island). The gap between
 * the flex segments makes the break, so no background masking is needed.
 */
export default function Hr() {
  return (
    <div
      role="separator"
      class="text-neu-400 dark:text-neu-500 my-10! flex items-center gap-3"
    >
      <span class="bg-neu-300 dark:bg-neu-700 h-px flex-1" />
      <span
        aria-hidden
        class="text-accent-700 dark:text-accent-400 leading-none"
      >
        ❦
      </span>
      <span class="bg-neu-300 dark:bg-neu-700 h-px flex-1" />
    </div>
  );
}
