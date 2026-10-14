import astro from "@hasparus/eslint-config/astro";
import solid from "@hasparus/eslint-config/solid";
import checkFile from "eslint-plugin-check-file";

export default [
  { ignores: ["**/*.mdx", "**/*.md", "**/*.gitignored.*"] },

  ...astro,
  ...solid,

  {
    settings: {
      "better-tailwindcss": { entryPoint: "src/global-styles/base.css" },
    },
  },

  {
    rules: {
      "unicorn/consistent-function-scoping": "off",
      "unicorn/no-useless-spread": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXAttribute[name.name=/^(class|className)$/] > JSXExpressionContainer :matches(TemplateLiteral[expressions.length>0], BinaryExpression[operator='+'])",
          message:
            "Do not concatenate classes. Use cn(), Solid classList, or Astro class:list instead.",
        },
      ],
    },
  },

  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "*.config.*",
            "*.mjs",
            "*.js",
            ".github/scripts/*.mjs",
            ".github/scripts/*.ts",
          ],
        },
      },
    },
  },

  {
    files: ["src/**/*.ts"],
    ignores: ["**/*.d.ts", "**/*.xml.ts", "**/*.txt.ts", "**/*.md.ts"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/filename-blocklist": ["error", { "**/*.ts": "*.tsx" }],
    },
  },
];
