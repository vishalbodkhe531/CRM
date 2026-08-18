import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "node_modules"]),

  {
    files: ["**/*.{ts,tsx}"],

    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],

    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },

    rules: {
      // ✅ Clean dev experience
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // ✅ Keep flexible during dev
      "@typescript-eslint/no-explicit-any": "warn",

      // ✅ Allow console in dev (IMPORTANT)
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // ✅ React fast refresh safe
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // ✅ Prevent deep feature imports (apply everywhere)
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              "group": ["@/features/*/**"],
              "message": "Deep imports from features are forbidden. Use the feature's barrel file (@/features/auth, etc.).",
              "allowTypeImports": true
            }
          ]
        }
      ]
    },
  },

  // 🧪 PAGES LAYER: May import deeply from features to avoid barrel cycles
  {
    files: ["src/pages/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              "group": ["@/app/**"],
              "message": "Pages must not depend on the app layer (Store/Routing config)."
            }
          ]
        }
      ]
    }
  },

  // 🛡️ LIB LAYER: Must not depend on features
  {
    files: ["src/lib/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              "group": ["@/features/*"],
              "message": "The lib layer must not depend on features (Domain logic)."
            }
          ]
        }
      ]
    }
  },

  // 🛡️ UI PRIMITIVES: Must not depend on features or lib
  {
    files: ["src/components/ui/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              "group": ["@/features/*", "@/lib/*"],
              "message": "UI primitives must be pure and not depend on features or complex libraries."
            }
          ]
        }
      ]
    }
  }
]);
