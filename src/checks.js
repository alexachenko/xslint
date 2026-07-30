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
 * A formatting defect at an offset inside an attribute or expression node. The
 * reported column is `node.columnNumber + 1 + offset` — the one the finders
 * compute — and the fix, when given as `{value, replacement, suggestion?}`, is
 * anchored at that column and carries the decoded `offset`, so the fixer can
 * decode-walk from the node's raw start to the match even past an entity that
 * shifts it. Omit `fix` for a report-only defect.
 * @param {string} check - Check name
 * @param {{severity: string, message: string}} meta - The check metadata
 * @param {string} file - File the node sits in
 * @param {Node} node - The attribute or expression node
 * @param {number} offset - Offset of the defect within the node value
 * @param {?{value: string, replacement: string, suggestion?: boolean}} fix -
 *  The fix, or undefined for a report-only defect
 * @return {object} - Defect
 */
const defect = function(check, meta, file, node, offset, fix) {
  const pos = node.columnNumber + 1 + offset
  const anchored = fix === undefined ?
    undefined :
    {line: node.lineNumber, col: pos, offset: offset, ...fix}
  return {
    name: check,
    severity: meta.severity,
    message: meta.message,
    file: file,
    line: node.lineNumber,
    pos: pos,
    ...(anchored === undefined ? {} : {fix: anchored}),
  }
}

module.exports = {
  metaOf,
  suppressed,
  defect,
}
