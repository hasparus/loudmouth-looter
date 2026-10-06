import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import solidJs from "@astrojs/solid-js";
import { createTransformerFactory, rendererRich } from "@shikijs/twoslash";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createTwoslasher } from "twoslash";
import ts from "typescript-js";

import { rehypePlugins, remarkPlugins } from "./src/build-time";
import { recmaMdxExcerpt } from "./src/build-time/excerptPlugin";
import { getHiddenPostPaths } from "./src/build-time/hiddenPostPaths";

const __filename = fileURLToPath(import.meta.url);

const __dirname = dirname(__filename);

const tsJsLibDirectory = dirname(
  createRequire(import.meta.url).resolve("typescript-js/package.json"),
) + "/lib";

// TS 7 is the native port and has no JS compiler API (ts.sys is undefined), so
// twoslash runs on an aliased TS 6. @shikijs/twoslash doesn't forward
// tsLibDirectory, hence the manual factory.
const twoslashTransformer = createTransformerFactory(
  createTwoslasher({
    compilerOptions: { moduleResolution: 100 },
    tsLibDirectory: tsJsLibDirectory,
    tsModule: ts,
  }),
  rendererRich(),
);

const hostname = "lol.haspar.us";
const site = `https://${hostname}/`;

const stripTrailingSlash = (path: string) => path.replace(/\/+$/, "") || "/";

const isProd = process.env.NODE_ENV === "production";
const hiddenPaths = getHiddenPostPaths(resolve(__dirname, "./posts"), {
  isProd,
});

export default defineConfig({
  site,
  env: {
    schema: {
      OG_IMAGE_SECRET: envField.string({
        context: "server",
        access: "secret",
      }),
    },
  },
  markdown: {
    syntaxHighlight: "shiki",
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      transformers: [
        twoslashTransformer({
          explicitTrigger: true,
          twoslashOptions: {
            compilerOptions: {
              strict: true,
              module: 199,
              moduleResolution: 99,
              target: 99,
              types: ["node"],
            },
          },
        }),
      ],
    },
    processor: unified({
      remarkPlugins: remarkPlugins(__dirname),
      rehypePlugins,
      gfm: true,
    }),
  },
  integrations: [
    mdx({
      extendMarkdownConfig: true,
      recmaPlugins: [recmaMdxExcerpt],
    }),
    solidJs(),
    sitemap({
      filter: (page) =>
        !hiddenPaths.has(stripTrailingSlash(new URL(page).pathname)),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ["@fontsource/crimson-text"],
    },
    define: {
      "import.meta.env.PUBLIC_URL": JSON.stringify(makePublicURL()),
    },
  },
});

function makePublicURL() {
  const VERCEL_URL = process.env.VERCEL_URL;
  const DEPLOYMENT_ALIAS = process.env.DEPLOYMENT_ALIAS;

  if (process.env.CI && process.env.GITHUB_REF === "refs/heads/main") {
    return site;
  }

  // If the site is built on vercel, we can just use VERCEL_URL.
  if (VERCEL_URL) return VERCEL_URL;

  if (!DEPLOYMENT_ALIAS) {
    // If there's no DEPLOYMENT_ALIAS nor VERCEL_URL, we assume we're building locally.
    return "http://localhost:3000/";
  }

  // Otherwise, we build on GitHub Actions (and get access to Git History).
  // If DEPLOYMENT_ALIAS is set to `main--${hostname}`, we're on the main branch,
  // and we return the canonical URL.
  if (DEPLOYMENT_ALIAS === `main--${hostname}`) return site;

  // Otherwise, we're building a preview deployment, and set the deployment alias
  // in `import.meta.env.PUBLIC_URL`.
  return `https://${DEPLOYMENT_ALIAS}`;
}
