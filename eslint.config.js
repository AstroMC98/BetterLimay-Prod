import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      // Python tooling artifacts. ESLint has nothing to lint in them, and it
      // aborts the whole run on an EPERM if it cannot scandir one.
      "**/__pycache__/**",
      "**/.pytest_cache/**",
      // Acquired source payloads; see sources/README.md.
      "sources/**",
      // Pipeline stage outputs are generated.
      "pipeline/raw_data/**",
      "pipeline/normalized_data/**",
      "pipeline/parsed_data/**",
      "pipeline/generated_data/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      sourceType: "module",
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["scripts/**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.node,
        AbortController: "readonly",
        clearTimeout: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
      },
      sourceType: "module",
    },
  },
  prettier,
);
