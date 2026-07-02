import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist", "node_modules", ".tmp"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        BlobPart: "readonly",
        DedicatedWorkerGlobalScope: "readonly",
        ImageData: "readonly",
        React: "readonly",
        Transferable: "readonly",
        URL: "readonly",
        Worker: "readonly",
        console: "readonly",
        crypto: "readonly",
        document: "readonly",
        navigator: "readonly",
        performance: "readonly",
        postMessage: "readonly",
        self: "readonly",
        setTimeout: "readonly",
        window: "readonly",
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
