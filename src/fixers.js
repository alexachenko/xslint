/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {deletion} = require('./fixes')

/**
 * Fix for `using-disable-output-escaping`: delete the attribute. Removing it
 * changes how the output is escaped, so it is a suggestion.
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
 * Fix for `output-method-xml`: switch the method to `html`. It changes the
 * serialization, so it is a suggestion.
 * @param {Element} node - The `xsl:output` element
 * @return {object} - The suggestion fix
 */
const outputMethodXml = function(node) {
  const method = node.getAttributeNode('method')
  return {
    line: method.lineNumber,
    col: method.columnNumber + 1,
    value: 'xml',
    replacement: 'html',
    suggestion: true,
  }
}

/**
 * Fix for `missing-version-in-stylesheet`: declare `version="1.0"` right after
 * the element name. The version is a guess, so it is a suggestion.
 * @param {Element} node - The `xsl:stylesheet` element
 * @return {object} - The suggestion fix
 */
const missingVersion = function(node) {
  return {
    line: node.lineNumber,
    col: node.columnNumber + node.nodeName.length + 1,
    value: '',
    replacement: ' version="1.0"',
    suggestion: true,
  }
}

/**
 * Fix for `mode-or-priority-without-match`: delete the orphan attribute. It is
 * one of two corrections the rule offers (the other is adding `match`), so it
 * is a suggestion, and only when exactly one of `mode`/`priority` is present
 * can a single deletion resolve the defect — with both, there is no fix.
 * @param {Element} node - The `xsl:template` element
 * @return {?object} - The suggestion fix, or null
 */
const modeOrPriority = function(node) {
  const present = ['mode', 'priority'].filter((name) => node.hasAttribute(name))
  return present.length === 1 ?
    {...deletion(node.getAttributeNode(present[0])), suggestion: true} :
    null
}

/**
 * Fix for `starts-with-double-slash`: drop the leading `//` of the template's
 * `@match`. In a match pattern the leading `//` is redundant — a pattern is
 * already unanchored — so removing it preserves the matched nodes, which makes
 * this a safe fix rather than a suggestion.
 * @param {Element} node - The `xsl:template` element
 * @return {object} - The safe fix
 */
const startsWithDoubleSlash = function(node) {
  const match = node.getAttributeNode('match')
  return {
    line: match.lineNumber,
    col: match.columnNumber - match.name.length - 1,
    value: `${match.name}="${match.value}"`,
    replacement: `${match.name}="${match.value.slice(2)}"`,
  }
}

/**
 * Fix for `incorrect-use-of-boolean-constants`: replace the string literal
 * test `'true'`/`'false'` with the boolean `true()`/`false()`. A suggestion,
 * since `'false'` is a non-empty string that is always true, so the rewrite
 * changes the test's truth value — which is the point.
 * @param {Element} node - The `xsl:if`/`xsl:when` element
 * @return {object} - The suggestion fix
 */
const booleanConstant = function(node) {
  const test = node.getAttributeNode('test')
  return {
    line: test.lineNumber,
    col: test.columnNumber - test.name.length - 1,
    value: `${test.name}="${test.value}"`,
    replacement:
      `${test.name}="${test.value.includes('true') ? 'true()' : 'false()'}"`,
    suggestion: true,
  }
}

/**
 * Fix for `select-starts-with-double-slash`: anchor the leading `//` of a
 * `@select` as `.//`, so it scans the context node's descendants rather than
 * the whole document. A suggestion, since it changes behaviour (absolute to
 * relative) and `.//` is one of several valid anchors.
 * @param {Element} node - The element carrying the `@select`
 * @return {object} - The suggestion fix
 */
const selectDoubleSlash = function(node) {
  const select = node.getAttributeNode('select')
  const at = select.value.indexOf('//')
  return {
    line: select.lineNumber,
    col: select.columnNumber - select.name.length - 1,
    value: `${select.name}="${select.value}"`,
    replacement:
      `${select.name}="${select.value.slice(0, at)}.${select.value.slice(at)}"`,
    suggestion: true,
  }
}

/**
 * Fix builders for declarative Xpath checks, keyed by check name. The per-file
 * linter attaches the fix a builder returns to the defect it found for that
 * check, so a rule stays declarative while still carrying a fix; a builder
 * returns null when it cannot resolve the defect with a single edit.
 * @type {{[check: string]: function(Node): ?object}}
 */
const FIXERS = {
  'using-disable-output-escaping': disableOutputEscaping,
  'output-method-xml': outputMethodXml,
  'missing-version-in-stylesheet': missingVersion,
  'mode-or-priority-without-match': modeOrPriority,
  'starts-with-double-slash': startsWithDoubleSlash,
  'incorrect-use-of-boolean-constants': booleanConstant,
  'select-starts-with-double-slash': selectDoubleSlash,
}

module.exports = {
  FIXERS,
}
