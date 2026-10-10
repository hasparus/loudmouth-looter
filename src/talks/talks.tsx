import type { PostFrontmatter } from "../types";

export interface TalkEntry {
  talk: true;
  frontmatter: Pick<PostFrontmatter, "title" | "description" | "date" | "path">;
}

export const talks: TalkEntry[] = [
  {
    talk: true,
    frontmatter: {
      title: "West Marches",
      description: "Jak prowadzić kampanie, których nie zabija kalendarz.",
      date: "2026-09-06",
      path: "/talks/west-marches",
    },
  },
  {
    talk: true,
    frontmatter: {
      title: "Never Quest",
      description: "Jak jeszcze raz usłyszę questgiver… wyrzucę za burtę!",
      date: "2026-09-06",
      path: "/talks/neverquest",
    },
  },
];
