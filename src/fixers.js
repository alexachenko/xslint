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
}

module.exports = {
  FIXERS,
}
