module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  extends: ["@edgeandnode"],
  plugins: ["better-tailwindcss", "check-file"],
  settings: {
    react: { version: "999.999.999" },
    "better-tailwindcss": { entryPoint: "src/global-styles/base.css" },
  },
  rules: {
    "better-tailwindcss/no-unknown-classes": [
      "error",
      {
        ignore: [
          "^zaduma-",
          "^te-",
          "^rm-arrow$",
          "^contains-task-list$",
        ],
      },
    ],
  },
  overrides: [
    {
      files: ["src/**/*.ts"],
      excludedFiles: ["**/*.d.ts", "**/*.xml.ts", "**/*.txt.ts", "**/*.md.ts"],
      rules: {
        "check-file/filename-blocklist": ["error", { "**/*.ts": "*.tsx" }],
      },
    },
    {
      files: ["*.ts", "*.tsx"],
      parserOptions: {
        project: [
          require.resolve("./tsconfig.json"),
          require.resolve("./src/editor/tsconfig.json"),
        ],
      },
      rules: {
        "react/jsx-key": "off",
        "react/style-prop-object": "off",
      },
    },
    {
      files: ["*.astro"],
      parser: "astro-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".astro"],
      },
      rules: {},
    },
  ],
};
