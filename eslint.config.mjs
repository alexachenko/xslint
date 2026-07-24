/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

import { defineConfig } from "eslint/config";
import path from "path";
import { fileURLToPath } from "url";
import js from "@eslint/js";
import globals from "globals";
import jsdoc from "eslint-plugin-jsdoc";
import stylistic from "@stylistic/eslint-plugin";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

// A project-local rule: a variable whose only purpose is to be returned by the
// very next statement is redundant and should be inlined. No plugin dependency
// is needed — a single no-restricted-syntax selector cannot compare a
// declaration's name with the identifier the following return uses.
const local = {
  rules: {
    "no-redundant-return-variable": {
      meta: {
        type: "suggestion",
        docs: {
          description:
            "disallow a variable that only exists to be returned next"
        },
        messages: {
          redundant:
            "Return the expression directly instead of binding it to a " +
            "variable first"
        }
      },
      create(context) {
        return {
          ReturnStatement(node) {
            const block = node.parent;
            if (
              !node.argument ||
              node.argument.type !== "Identifier" ||
              block.type !== "BlockStatement"
            ) {
              return;
            }
            const prev = block.body[block.body.indexOf(node) - 1];
            if (
              prev &&
              prev.type === "VariableDeclaration" &&
              prev.declarations.length === 1 &&
              prev.declarations[0].id.type === "Identifier" &&
              prev.declarations[0].id.name === node.argument.name
            ) {
              context.report({ node: prev, messageId: "redundant" });
            }
          }
        };
      }
    }
  }
};

export default defineConfig([
  { ignores: ["eslint.config.mjs", "docs/**"] },
  js.configs.recommended,
  ...compat.extends("google"),
  jsdoc.configs["flat/recommended-error"],
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      globals: { ...globals.node, ...globals.mocha },
      ecmaVersion: 2022,
      sourceType: "commonjs"
    },
    settings: {
      jsdoc: {
        tagNamePreference: { returns: "return" }
      }
    },
    plugins: { "@stylistic": stylistic, local },
    rules: {
      "local/no-redundant-return-variable": "error",
      "valid-jsdoc": "off",
      "require-jsdoc": "off",
      semi: ["error", "never"],
      "comma-dangle": ["error", "always-multiline"],
      indent: ["error", 2],
      camelcase: ["error", { properties: "never" }],
      "max-len": ["error", {
        code: 80,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true
      }],
      "jsdoc/no-undefined-types": [
        "error",
        { definedTypes: ["Document", "Node", "Element"] }
      ],
      "jsdoc/reject-any-type": "off",
      "@stylistic/space-infix-ops": "error",
      "id-length": ["error", { min: 2 }],
      "no-restricted-syntax": ["error",
        {
          selector: "UpdateExpression[prefix=true]",
          message: "Use postfix increment/decrement (x++), not prefix (++x)"
        },
        {
          selector:
            "CallExpression[callee.name='require'][arguments.0.value=/^node:/]",
          message:
            "Do not use the 'node:' prefix in require; use the bare name"
        },
        {
          selector: "ImportDeclaration[source.value=/^node:/]",
          message:
            "Do not use the 'node:' prefix in import; use the bare name"
        }
      ]
    }
  },
  {
    files: ["src/**/*.js", "src/**/*.mjs"],
    rules: {
      "jsdoc/require-jsdoc": ["error", {
        require: { FunctionDeclaration: true, FunctionExpression: true }
      }]
    }
  },
  {
    files: ["**/*.mjs"],
    languageOptions: { sourceType: "module" }
  }
]);
