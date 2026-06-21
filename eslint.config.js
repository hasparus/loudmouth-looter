// ESLint flat config — replaces .eslintrc.cjs for ESLint 10+
// Manually inlines @edgeandnode/eslint-config v2.0.3 rules since that
// package uses @rushstack/eslint-patch which is incompatible with ESLint 10.
// Uses @eslint/compat's fixupPluginRules to adapt ESLint-8-vintage plugins.

import { fixupPluginRules } from "@eslint/compat";
import { createRequire } from "module";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Load plugins (all installed as transitive deps of @edgeandnode/eslint-config)
// fixupPluginRules adapts ESLint 8-era plugins to the ESLint 10 flat config API
const tsPlugin = fixupPluginRules(require("@typescript-eslint/eslint-plugin"));
const tsParser = require("@typescript-eslint/parser");
const importPlugin = fixupPluginRules(require("eslint-plugin-import"));
const simpleImportSortPlugin = fixupPluginRules(require("eslint-plugin-simple-import-sort"));
// eslint-plugin-sonarjs v0.19 crashes with ESLint 10 even via fixupPluginRules
// (the onCodePathSegmentLoop API changed). Dropping sonarjs until the
// dependency can be upgraded to v1+ which has native ESLint 10 support.
// const sonarjsPlugin = ...
const reactPlugin = fixupPluginRules(require("eslint-plugin-react"));
const reactHooksPlugin = fixupPluginRules(require("eslint-plugin-react-hooks"));
const jsxA11yPlugin = fixupPluginRules(require("eslint-plugin-jsx-a11y"));
const astroParser = require("astro-eslint-parser");

// Note: eslint-plugin-sonarjs v0.19 is incompatible with ESLint 10 —
// it crashes in onCodePathSegmentLoop. Sonarjs rules are omitted here.

// Base rules from @edgeandnode/eslint-config (createEslintConfig)
const baseRules = {
  "array-callback-return": "warn",
  "dot-location": ["warn", "property"],
  "eqeqeq": ["warn", "smart"],
  "new-parens": "warn",
  "no-caller": "warn",
  "no-cond-assign": ["warn", "except-parens"],
  "no-const-assign": "warn",
  "no-control-regex": "warn",
  "no-delete-var": "warn",
  "no-dupe-args": "off",
  "no-dupe-keys": "off",
  "no-duplicate-case": "warn",
  "no-empty-character-class": "warn",
  "no-empty-pattern": "warn",
  "no-eval": "warn",
  "no-ex-assign": "warn",
  "no-extend-native": "warn",
  "no-extra-bind": "warn",
  "no-extra-label": "warn",
  "no-fallthrough": "warn",
  "no-func-assign": "off",
  "no-implied-eval": "off",
  "no-invalid-regexp": "warn",
  "no-iterator": "warn",
  "no-label-var": "warn",
  "no-labels": ["warn", { allowLoop: true, allowSwitch: false }],
  "no-lone-blocks": "warn",
  "no-loop-func": "off",
  "no-mixed-operators": [
    "warn",
    {
      groups: [
        ["&", "|", "^", "~", "<<", ">>", ">>>"],
        ["==", "!=", "===", "!==", ">", ">=", "<", "<="],
        ["&&", "||"],
        ["in", "instanceof"],
      ],
      allowSamePrecedence: false,
    },
  ],
  "no-multi-str": "warn",
  "no-native-reassign": "warn",
  "no-negated-in-lhs": "warn",
  "no-new-func": "warn",
  "no-new-object": "warn",
  "no-new-symbol": "warn",
  "no-new-wrappers": "warn",
  "no-obj-calls": "warn",
  "no-octal": "warn",
  "no-octal-escape": "warn",
  "no-redeclare": "off",
  "no-regex-spaces": "warn",
  "no-restricted-syntax": ["warn", "WithStatement"],
  "no-script-url": "warn",
  "no-self-assign": "warn",
  "no-self-compare": "warn",
  "no-sequences": "warn",
  "no-shadow-restricted-names": "warn",
  "no-sparse-arrays": "warn",
  "no-template-curly-in-string": "warn",
  "no-this-before-super": "warn",
  "no-throw-literal": "warn",
  "no-restricted-globals": [
    "error",
    "addEventListener", "blur", "close", "closed", "confirm", "defaultStatus",
    "defaultstatus", "event", "external", "find", "focus", "frameElement",
    "frames", "history", "innerHeight", "innerWidth", "length", "location",
    "locationbar", "menubar", "moveBy", "moveTo", "name", "onblur", "onerror",
    "onfocus", "onload", "onresize", "onunload", "open", "opener", "opera",
    "outerHeight", "outerWidth", "pageXOffset", "pageYOffset", "parent",
    "print", "removeEventListener", "resizeBy", "resizeTo", "screen",
    "screenLeft", "screenTop", "screenX", "screenY", "scroll", "scrollbars",
    "scrollBy", "scrollTo", "scrollX", "scrollY", "self", "status",
    "statusbar", "stop", "toolbar", "top",
  ],
  "no-unexpected-multiline": "warn",
  "no-unused-labels": "warn",
  "no-useless-computed-key": "warn",
  "no-useless-concat": "warn",
  "no-useless-escape": "warn",
  "no-useless-rename": [
    "warn",
    { ignoreDestructuring: false, ignoreImport: false, ignoreExport: false },
  ],
  "no-with": "warn",
  "no-whitespace-before-property": "warn",
  "require-yield": "warn",
  "rest-spread-spacing": ["warn", "never"],
  "strict": ["warn", "never"],
  "unicode-bom": ["warn", "never"],
  "use-isnan": "warn",
  "valid-typeof": "warn",
  "no-unreachable": "off",
  "no-restricted-properties": [
    "error",
    {
      object: "require",
      property: "ensure",
      message: "Please use import() instead.",
    },
    {
      object: "System",
      property: "import",
      message: "Please use import() instead.",
    },
  ],
  "getter-return": "off",
  "default-case": "off",
  "no-dupe-class-members": "off",
  "no-undef": "off",
  // typescript-eslint base rules
  "@typescript-eslint/adjacent-overload-signatures": "error",
  "@typescript-eslint/ban-ts-comment": [
    "warn",
    {
      "ts-expect-error": "allow-with-description",
      "ts-ignore": "allow-with-description",
      "ts-nocheck": "allow-with-description",
      "ts-check": false,
      minimumDescriptionLength: 3,
    },
  ],
  // "@typescript-eslint/ban-types" removed in v7 — no replacement needed
  "@typescript-eslint/explicit-module-boundary-types": "off",
  "no-array-constructor": "off",
  "@typescript-eslint/no-array-constructor": "error",
  "no-empty-function": "off",
  "@typescript-eslint/no-empty-function": "off",
  "@typescript-eslint/no-empty-interface": "off",
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-extra-non-null-assertion": "error",
  // "@typescript-eslint/no-extra-semi" removed in v6 — use "no-extra-semi" from ESLint core
  "no-extra-semi": "off",
  "@typescript-eslint/no-inferrable-types": "error",
  "@typescript-eslint/no-misused-new": "error",
  "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
  "@typescript-eslint/no-non-null-assertion": "off",
  "@typescript-eslint/no-this-alias": "error",
  "no-unused-vars": "off",
  "@typescript-eslint/no-unused-vars": "off",
  "@typescript-eslint/no-var-requires": "error",
  "@typescript-eslint/prefer-as-const": "error",
  "@typescript-eslint/prefer-namespace-keyword": "error",
  "@typescript-eslint/triple-slash-reference": "error",
  "@typescript-eslint/consistent-type-assertions": "warn",
  "@typescript-eslint/no-namespace": [
    "warn",
    { allowDeclarations: true, allowDefinitionFiles: true },
  ],
  "@typescript-eslint/no-unused-expressions": [
    "error",
    { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true },
  ],
  "require-await": "off",
  "no-use-before-define": "off",
  "no-useless-constructor": "off",
  "prefer-rest-params": "error",
  "prefer-spread": "error",
  "prefer-const": "warn",
  "no-var": "off",
  "@typescript-eslint/array-type": "off",
  "@typescript-eslint/ban-tslint-comment": "off",
  // sonarjs rules omitted: v0.19 is incompatible with ESLint 10
  // import
  "import/no-anonymous-default-export": "error",
  // simple-import-sort
  "simple-import-sort/exports": "warn",
  "simple-import-sort/imports": [
    "warn",
    {
      groups: [
        [
          "^(_http_agent|_http_client|_http_common|_http_incoming|_http_outgoing|_http_server|_stream_duplex|_stream_passthrough|_stream_readable|_stream_transform|_stream_wrap|_stream_writable|_tls_common|_tls_wrap|assert|assert/strict|async_hooks|buffer|child_process|cluster|console|constants|crypto|dgram|diagnostics_channel|dns|dns/promises|domain|events|fs|fs/promises|http|http2|https|inspector|inspector/promises|module|net|os|path|path/posix|path/win32|perf_hooks|process|punycode|querystring|readline|readline/promises|repl|stream|stream/consumers|stream/promises|stream/web|string_decoder|sys|timers|timers/promises|tls|trace_events|tty|url|util|util/types|v8|vm|wasi|worker_threads|zlib)(/|$)",
        ],
        ["^@?\\w"],
        ["^@edgeandnode(/.*|$)"],
        ["^@/"],
        ["^\\.\\./(?!/?$)", "^\\.\\./?$"],
        ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
        ["^\\u0000"],
      ],
    },
  ],
};

// TypeScript type-checked rules (applied to .ts/.tsx files with project info)
const typescriptTypeCheckedRules = {
  "@typescript-eslint/await-thenable": "warn",
  "@typescript-eslint/no-floating-promises": "warn",
  "@typescript-eslint/no-for-in-array": "error",
  "@typescript-eslint/no-implied-eval": "error",
  "@typescript-eslint/no-misused-promises": "error",
  "@typescript-eslint/no-unnecessary-type-assertion": "warn",
  "@typescript-eslint/no-unsafe-assignment": "off",
  "@typescript-eslint/no-unsafe-call": "off",
  "@typescript-eslint/no-unsafe-member-access": "off",
  "@typescript-eslint/no-unsafe-return": "warn",
  "@typescript-eslint/prefer-regexp-exec": "warn",
  "@typescript-eslint/require-await": "off",
  "@typescript-eslint/restrict-plus-operands": "off",
  "@typescript-eslint/restrict-template-expressions": "off",
  "@typescript-eslint/unbound-method": "off",
  "@typescript-eslint/no-use-before-define": [
    "warn",
    { functions: false, classes: false, variables: false, typedefs: false },
  ],
  "@typescript-eslint/no-useless-constructor": "warn",
  "@typescript-eslint/no-base-to-string": "warn",
  "@typescript-eslint/no-unnecessary-boolean-literal-compare": "warn",
  "@typescript-eslint/no-unnecessary-condition": "warn",
  "@typescript-eslint/no-unnecessary-type-arguments": "warn",
  "@typescript-eslint/non-nullable-type-assertion-style": "warn",
  "@typescript-eslint/prefer-includes": "warn",
  "@typescript-eslint/prefer-return-this-type": "warn",
  "@typescript-eslint/prefer-string-starts-ends-with": "warn",
  "@typescript-eslint/no-confusing-void-expression": "off",
  "@typescript-eslint/no-duplicate-enum-values": "error",
  "@typescript-eslint/no-duplicate-type-constituents": "error",
  "@typescript-eslint/no-dynamic-delete": "error",
  "@typescript-eslint/no-extraneous-class": "error",
  "@typescript-eslint/no-invalid-void-type": "error",
  "@typescript-eslint/no-loss-of-precision": "error",
  "@typescript-eslint/no-meaningless-void-operator": "error",
  "@typescript-eslint/no-mixed-enums": "error",
  "@typescript-eslint/no-non-null-asserted-nullish-coalescing": "error",
  "@typescript-eslint/no-redundant-type-constituents": "error",
  // "@typescript-eslint/no-throw-literal" renamed to "only-throw-error" in v7
  "@typescript-eslint/only-throw-error": "error",
  "@typescript-eslint/no-unnecessary-type-constraint": "error",
  "@typescript-eslint/no-unsafe-argument": "error",
  "@typescript-eslint/no-unsafe-declaration-merging": "error",
  "@typescript-eslint/no-unsafe-enum-comparison": "error",
  "@typescript-eslint/prefer-literal-enum-member": "warn",
  "@typescript-eslint/prefer-reduce-type-parameter": "warn",
  "@typescript-eslint/prefer-ts-expect-error": "warn",
  "@typescript-eslint/unified-signatures": "warn",
};

// Shared plugin registry — all plugins registered here are available to all
// config blocks. Rules are still only enabled where explicitly configured.
const plugins = {
  "@typescript-eslint": tsPlugin,
  "import": importPlugin,
  "simple-import-sort": simpleImportSortPlugin,
  // React/JSX plugins registered globally so ESLint 10 can resolve rule
  // references even when the active rules are scoped to src/editor/**/*.tsx.
  "react": reactPlugin,
  "react-hooks": reactHooksPlugin,
  "jsx-a11y": jsxA11yPlugin,
};

export default [
  // Global ignores (replaces .eslintignore)
  {
    ignores: ["**/*.mdx", "**/*.md"],
  },

  // Base config for all files
  {
    plugins,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
    },
    settings: {
      react: { version: "999.999.999" },
      "import/extensions": [".js", ".jsx", ".ts", ".tsx"],
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx", ".d.ts"],
      },
    },
    rules: baseRules,
  },

  // TypeScript files with type-checked rules
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: [
          resolve(__dirname, "./tsconfig.json"),
          resolve(__dirname, "./src/editor/tsconfig.json"),
        ],
      },
    },
    rules: {
      ...typescriptTypeCheckedRules,
      // Overrides from original .eslintrc.cjs
      "react/jsx-key": "off",
      "react/style-prop-object": "off",
    },
  },

  // TSX files — add React/JSX rules (only editor, rest uses SolidJS)
  {
    files: ["src/editor/**/*.tsx"],
    plugins,
    settings: {
      react: { version: "999.999.999" },
    },
    rules: {
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/anchor-has-content": "warn",
      "jsx-a11y/anchor-is-valid": ["warn", { aspects: ["noHref", "invalidHref"] }],
      "jsx-a11y/aria-activedescendant-has-tabindex": "warn",
      "jsx-a11y/aria-props": "warn",
      "jsx-a11y/aria-proptypes": "warn",
      "jsx-a11y/aria-role": "warn",
      "jsx-a11y/aria-unsupported-elements": "warn",
      "jsx-a11y/heading-has-content": "warn",
      "jsx-a11y/iframe-has-title": "warn",
      "jsx-a11y/img-redundant-alt": "warn",
      "jsx-a11y/no-access-key": "warn",
      "jsx-a11y/no-distracting-elements": "warn",
      "jsx-a11y/no-redundant-roles": "warn",
      "jsx-a11y/role-has-required-aria-props": "warn",
      "jsx-a11y/role-supports-aria-props": "warn",
      "jsx-a11y/scope": "warn",
      "jsx-a11y/accessible-emoji": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react/require-render-return": "error",
      "react/no-typos": "error",
      "react/forbid-foreign-prop-types": ["warn", { allowInPropTypes: true }],
      "react/jsx-no-comment-textnodes": "warn",
      "react/jsx-no-duplicate-props": "warn",
      "react/jsx-no-target-blank": "warn",
      "react/jsx-no-undef": "error",
      "react/jsx-pascal-case": ["warn", { allowAllCaps: true, ignore: [] }],
      "react/no-danger-with-children": "warn",
      "react/style-prop-object": "off",
      "react/no-is-mounted": "warn",
      "react/no-unstable-nested-components": ["warn", { allowAsProps: true }],
      "react/no-direct-mutation-state": "off",
      "react/react-in-jsx-scope": "off",
      "react/jsx-no-useless-fragment": "off",
      "react/jsx-key": "off",
    },
  },

  // CJS/JS files — allow require()
  {
    files: ["**/*.cjs", "**/*.cts", "**/*.js", "**/*.jsx"],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
    },
  },

  // Astro files
  {
    files: ["**/*.astro"],
    plugins,
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: [".astro"],
      },
    },
    rules: {},
  },
];
