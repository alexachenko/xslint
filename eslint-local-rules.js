/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

// A project-local ESLint plugin, kept out of eslint.config.mjs so it can be
// unit-tested with ESLint's RuleTester (test/eslint-local-rules.test.js). Its
// one rule flags a variable whose only purpose is to be returned by the very
// next statement — that binding is redundant and should be inlined. No plugin
// dependency is needed; a single no-restricted-syntax selector cannot compare a
// declaration's name with the identifier the following return uses.
module.exports = {
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
