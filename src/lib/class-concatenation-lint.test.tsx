import { describe, expect, test } from "bun:test";
import { ESLint, Linter } from "eslint";

const config = (await new ESLint().calculateConfigForFile(
  "src/lib/Tooltip.tsx",
)) as Linter.Config;
const rule = config.rules?.["no-restricted-syntax"];
if (!rule) throw new Error("Class concatenation lint rule is not configured");

const linter = new Linter();
function lint(source: string) {
  return linter.verify(
    source,
    {
      files: ["**/*.jsx"],
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      rules: { "no-restricted-syntax": rule },
    },
    "example.jsx",
  );
}

describe("class concatenation lint rule", () => {
  const eslint = new ESLint();
  for (const [attribute, expected] of [
    [`class={\`\${classes} text-3xl\`}`, 1],
    ['class:list={[classes, "text-3xl"]}', 0],
  ] as const) {
    test(`checks Astro ${attribute}`, async () => {
      const results = await eslint.lintText(
        `---\nconst classes = "font-text";\n---\n<p ${attribute}>Text</p>`,
        { filePath: "src/pages/design.astro" },
      );
      const messages = results.flatMap((result) => result.messages);
      expect(messages.filter((message) => message.fatal)).toEqual([]);
      expect(
        messages.filter((message) => message.ruleId === "no-restricted-syntax"),
      ).toHaveLength(expected);
    }, 10_000);
  }

  for (const source of [
    `<div class={\`base \${props.class}\`} />`,
    `<div className={\`base \${props.className}\`} />`,
    '<div class={"base " + props.class} />',
    `<div class={active ? \`base \${extra}\` : "base"} />`,
    `<div class={cn("base", \`extra \${props.class}\`)} />`,
  ]) {
    test(`rejects ${source}`, () => {
      const messages = lint(source);
      expect(messages).toHaveLength(1);
      expect(messages[0]?.ruleId).toBe("no-restricted-syntax");
      expect(messages[0]?.message).toContain("Use cn()");
    });
  }

  for (const source of [
    '<div class="base" />',
    "<div class={props.class} />",
    '<div class={cn("base", props.class)} />',
    '<div class="base" classList={{ [styles.tip]: true }} />',
    '<div class={active ? "base active" : "base"} />',
    `<a class="base" href={\`/\${slug}\`} />`,
    '<div class:list={["base", extra]} />',
  ]) {
    test(`allows ${source}`, () => {
      expect(lint(source)).toEqual([]);
    });
  }
});
