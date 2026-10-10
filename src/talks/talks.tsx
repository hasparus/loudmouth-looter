import type { Entry } from "../lib/posts";

export const talks: Entry[] = [
  {
    linkLabel: "see slides",
    frontmatter: {
      title: "West Marches Talk",
      description: "How to run campaigns the calendar can't kill.",
      date: "2026-09-06",
      path: "/talks/west-marches",
      tags: ["talk", "🇵🇱", "kapitularz-2026", "west marches"],
    },
  },
  {
    linkLabel: "see slides",
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
