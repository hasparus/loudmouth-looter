import type { APIRoute } from "astro";

// AI/LLM training & answer-engine crawlers, explicitly allowed so the site
// stays "agent-ready".
const AI_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "ClaudeUser",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended",
  "Bytespider",
  "Amazonbot",
];

// Content Signals — declare how crawled content may be used.
// https://contentsignals.org, https://datatracker.ietf.org/doc/draft-romm-aipref-contentsignals/
// The `Content-Signal` directive lives inside a User-agent group; each signal
// is `yes`/`no`. This site opts in across the board to stay "agent-ready".
//   search   — index the content and surface it in search results
//   ai-input — feed the content to an AI model at inference time (e.g. RAG)
//   ai-train — train or fine-tune AI models on the content
const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=yes";

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error("`site` must be set in astro.config for robots.txt");
  }

  const lines: string[] = [ "User-agent: *", `Content-Signal: ${CONTENT_SIGNAL}`, "Allow: /", ""];


  for (const bot of AI_BOTS) {
    lines.push(`User-agent: ${bot}`, "Allow: /", "");
  }

  lines.push(`Sitemap: ${new URL("sitemap-index.xml", site).href}`);

  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
