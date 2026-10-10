import type { PostFrontmatter } from "../types";

export interface TalkEntry {
  talk: true;
  flag: string;
  frontmatter: Pick<
    PostFrontmatter,
    "title" | "description" | "date" | "path" | "tags"
  >;
}

export const talks: TalkEntry[] = [
  {
    talk: true,
    flag: "🇵🇱",
    frontmatter: {
      title: "West Marches",
      description: "How to run campaigns the calendar can't kill.",
      date: "2026-09-06",
      path: "/talks/west-marches",
      tags: ["west marches", "gm-ing"],
    },
  },
  {
    talk: true,
    flag: "🇵🇱",
    frontmatter: {
      title: "Never Quest",
      description:
        'If I hear "questgiver" one more time, I\'m throwing someone overboard. How I prep sandboxes around threats and factions instead of quests.',
      date: "2026-09-06",
      path: "/talks/neverquest",
      tags: ["sandbox", "pbta", "gm-ing"],
    },
  },
];
