import type { SlotOptions } from "slot-text";

export const SLOT_TEXT_OPTIONS: SlotOptions =
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches
    ? { duration: 0, stagger: 0 }
    : {
        duration: 480,
        stagger: 18,
        bounce: 0.5,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      };
