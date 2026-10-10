import type { PostFrontmatter } from "../types";

export interface TalkEntry {
  talk: true;
  frontmatter: Pick<
    PostFrontmatter,
    "title" | "description" | "date" | "path" | "tags"
  >;
}

export const talks: TalkEntry[] = [
  {
    talk: true,
    frontmatter: {
      title: "West Marches Talk",
      description: "How to run campaigns the calendar can't kill.",
      date: "2026-09-06",
      path: "/talks/west-marches",
      tags: ["talk", "🇵🇱", "kapitularz-2026", "west marches"],
    },
  },
  {
    talk: true,
    frontmatter: {
      title: '"Never Quest" Rant',
      description:
        'If I hear "questgiver" one more time, I\'m throwing someone overboard. How I prep sandboxes around threats and factions instead of quests.',
      date: "2026-09-06",
      path: "/talks/neverquest",
      tags: ["talk", "🇵🇱", "kapitularz-2026", "sandbox", "pbta"],
    },
  },
];
