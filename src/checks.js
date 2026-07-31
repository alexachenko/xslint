/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {yaml} = require('./helpers')
const path = require('path')

/**
 * Defect metadata of a formatting check, read from its YAML.
 * @param {string} check - Check name
 * @return {{severity: string, message: string}} - The metadata
 */
const metaOf = function(check) {
  return yaml.parsedFromFile(
    path.join(__dirname, 'resources', 'checks', 'format', `${check}.yaml`),
  )
}

/**
 * Whether a check is suppressed — a suppression matches it as a substring.
 * @param {string} check - Check name
 * @param {Array.<string>} suppressions - Suppressed checks
 * @return {boolean} - True when suppressed
 */
const suppressed = function(check, suppressions) {
  return suppressions.some((sup) => check.includes(sup))
}

/**
 * The markup a node's `columnNumber` sits on before its value begins: an
 * attribute opens on its quote, a CDATA section on its `<![CDATA[` marker, and
 * every other kind on the value itself.
 * @type {{[nodeType: number]: number}}
 */
const LEAD = {2: 1, 4: '<![CDATA['.length}

/**
 * A defect at an offset inside an attribute, text, or CDATA node. Its line and
 * column are the node's own, advanced by the newlines the offset spans
 * and, on the first line, past the markup the value opens with. The fix, when
 * given as `{value, replacement, suggestion?}`, is anchored there and carries
 * the decoded `offset`, so the fixer can decode-walk from the node's raw start
 * to the match even past an entity that shifts it. Omit `fix` for report-only.
 * @param {string} check - Check name
 * @param {{severity: string, message: string}} meta - The check metadata
 * @param {string} file - File the node sits in
 * @param {Node} node - The attribute, text, or CDATA node
 * @param {number} offset - Offset of the defect within the node value
 * @param {?{value: string, replacement: string, suggestion?: boolean}} [fix] -
 *  The fix, or undefined for a report-only defect
 * @return {object} - Defect
 */
const defect = function(check, meta, file, node, offset, fix = undefined) {
  const before = node.nodeValue.slice(0, offset)
  const newline = before.lastIndexOf('\n')
  const line = node.lineNumber + before.split('\n').length - 1
  const pos = newline < 0 ?
    node.columnNumber + (LEAD[node.nodeType] || 0) + offset :
    offset - newline
  const anchored = fix === undefined ?
    undefined :
    {line: line, col: pos, offset: offset, ...fix}
  return {
    name: check,
    severity: meta.severity,
    message: meta.message,
    file: file,
    line: line,
    pos: pos,
    ...(anchored === undefined ? {} : {fix: anchored}),
  }
}

module.exports = {
  metaOf,
  suppressed,
  defect,
}
