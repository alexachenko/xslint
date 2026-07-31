/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const path = require("path");

// How many arguments a caller must supply: every parameter up to the first one
// that carries a default or collects the rest.
const required = function (params) {
  const optional = params.findIndex(
    (par) => par.type === "AssignmentPattern" || par.type === "RestElement"
  );
  return optional === -1 ? params.length : optional;
};

// The parameter list of the function a binding holds, when that function is
// written out in the very file being linted, or null when it is not.
const written = function (def) {
  if (def.node.type === "FunctionDeclaration") {
    return def.node.params;
  }
  if (
    def.node.type === "VariableDeclarator" &&
    def.node.init &&
    (def.node.init.type === "FunctionExpression" ||
      def.node.init.type === "ArrowFunctionExpression")
  ) {
    return def.node.init.params;
  }
  return null;
};

// The module a `const ... = require('./somewhere')` binding pulls in, loaded
// from disk relative to the file being linted. Only a project-local path is
// followed, so no third-party signature is ever second-guessed, and anything
// that fails to resolve or to load leaves the call unjudged.
const loaded = function (def, from) {
  const init = def.node.type === "VariableDeclarator" ? def.node.init : null;
  if (
    !init ||
    init.type !== "CallExpression" ||
    init.callee.name !== "require" ||
    init.arguments.length !== 1 ||
    init.arguments[0].type !== "Literal" ||
    typeof init.arguments[0].value !== "string" ||
    !init.arguments[0].value.startsWith(".")
  ) {
    return null;
  }
  try {
    return require(path.resolve(path.dirname(from), init.arguments[0].value));
  } catch {
    return null;
  }
};

// The name a destructured binding takes out of its module — `defect` out of
// `const {defect} = require('./checks')` — or null when the binding is the
// whole module.
const taken = function (def) {
  if (
    def.node.type !== "VariableDeclarator" ||
    def.node.id.type !== "ObjectPattern"
  ) {
    return null;
  }
  const property = def.node.id.properties.find(
    (pro) => pro.type === "Property" && pro.value === def.name
  );
  return property && property.key.type === "Identifier" ?
    property.key.name :
    null;
};

// The variable a name resolves to at a scope, respecting shadowing.
const bound = function (scope, name) {
  for (let current = scope; current; current = current.upper) {
    const found = current.variables.find((va) => va.name === name);
    if (found) {
      return found;
    }
  }
  return null;
};

// How many arguments the function a variable holds demands, or null when the
// variable holds something this rule cannot read: a value that is not a
// function, one that arrives from outside the project, or a member of a
// binding that is itself only a piece of its module.
const demanded = function (variable, from, key) {
  if (!variable || variable.defs.length !== 1) {
    return null;
  }
  const def = variable.defs[0];
  const params = key === null ? written(def) : null;
  if (params) {
    return required(params);
  }
  if (key !== null && taken(def) !== null) {
    return null;
  }
  const target = loaded(def, from);
  if (target === null) {
    return null;
  }
  const name = key === null ? taken(def) : key;
  const fun = name === null ? target : target[name];
  return typeof fun === "function" ? fun.length : null;
};

// A project-local ESLint plugin, kept out of eslint.config.mjs so it can be
// unit-tested with ESLint's RuleTester (test/eslint-local-rules.test.js). One
// rule flags a variable whose only purpose is to be returned by the very next
// statement — that binding is redundant and should be inlined. The other flags
// a call that leaves out an argument the callee declares. No plugin dependency
// is needed; a single no-restricted-syntax selector can neither compare a
// declaration's name with the identifier the following return uses, nor weigh
// a call's argument count against the parameter list of the callee.
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
    },
    "no-missing-arguments": {
      meta: {
        type: "problem",
        docs: {
          description:
            "disallow a call that leaves out an argument the callee demands"
        },
        messages: {
          missing:
            "Pass every argument of '{{name}}': {{expected}} expected, " +
            "{{given}} given"
        }
      },
      create(context) {
        return {
          CallExpression(node) {
            const callee = node.callee;
            const named =
              callee.type === "Identifier" ||
              (callee.type === "MemberExpression" &&
                !callee.computed &&
                callee.object.type === "Identifier" &&
                callee.property.type === "Identifier");
            if (
              !named ||
              node.arguments.some((arg) => arg.type === "SpreadElement")
            ) {
              return;
            }
            const holder =
              callee.type === "Identifier" ? callee : callee.object;
            const expected = demanded(
              bound(context.sourceCode.getScope(node), holder.name),
              context.filename,
              callee.type === "Identifier" ? null : callee.property.name
            );
            if (expected !== null && node.arguments.length < expected) {
              context.report({
                node,
                messageId: "missing",
                data: {
                  name: context.sourceCode.getText(callee),
                  expected,
                  given: node.arguments.length
                }
              });
            }
          }
        };
      }
    }
  }
};
