export function cn(...classes: (boolean | string | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
