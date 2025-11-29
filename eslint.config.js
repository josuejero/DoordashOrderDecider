import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: ['dist/**', '**/dist/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
    },
    settings: {},
  },
  { 
    plugins: { "react-hooks": reactHooks },
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
      // turn off no undef
      'no-undef': 'off',
      // turn off no unused vars
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any':'off',
    },

    

  },
]);
