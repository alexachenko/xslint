/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {deletion} = require('./fixes')

/**
 * Fix for `using-disable-output-escaping`: delete the attribute. Removing it
 * changes how the output is escaped, so it is a suggestion — applied only under
 * `--fix-suggestions`, never silently by `--fix`.
 * @param {Element} node - The element carrying the attribute
 * @return {object} - The suggestion fix
 */
const disableOutputEscaping = function(node) {
  return {
    ...deletion(node.getAttributeNode('disable-output-escaping')),
    suggestion: true,
  }
}

/**
 * Fix builders for declarative Xpath checks, keyed by check name. The per-file
 * linter attaches the fix a builder returns to the defect it found for that
 * check, so a rule stays declarative while still carrying a fix.
 * @type {{[check: string]: function(Node): object}}
 */
const FIXERS = {
  'using-disable-output-escaping': disableOutputEscaping,
}

module.exports = {
  FIXERS,
}
