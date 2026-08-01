/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {yaml} = require('./helpers')
const {offsetAt, placeAt, skip} = require('./source')
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
 * column are where it truly stands in the source, which is not something the
 * parsed value can answer on its own: an attribute value arrives with its line
 * breaks normalised to spaces and its entities decoded, so the offset is walked
 * against the raw text from where the node opens. The fix, when given as
 * `{value, replacement, suggestion?}`, is anchored at that same place, which is
 * all the fixer needs to find it. It also carries `from`, the line the value
 * opens on, because a value that wraps can be silenced only from above the
 * element — no comment fits inside a start tag. Omit `fix` for report-only.
 * @param {string} check - Check name
 * @param {{severity: string, message: string}} meta - The check metadata
 * @param {{file: string, content: string}} source - The file the node sits
 *  in, with its raw text, which is the only place the line breaks a parser
 *  normalised away are still visible
 * @param {Node} node - The attribute, text, or CDATA node
 * @param {number} offset - Offset of the defect within the node value
 * @param {?{value: string, replacement: string, suggestion?: boolean}} [fix] -
 *  The fix, or undefined for a report-only defect
 * @return {object} - Defect
 */
const defect = function(check, meta, source, node, offset, fix = undefined) {
  const {line, pos} = placeAt(
    source.content,
    skip(
      source.content,
      offsetAt(source.content, node.lineNumber, node.columnNumber) +
        (LEAD[node.nodeType] || 0),
      offset,
    ),
  )
  const anchored = fix === undefined ?
    undefined :
    {line: line, col: pos, ...fix}
  return {
    name: check,
    severity: meta.severity,
    message: meta.message,
    file: source.file,
    line: line,
    from: node.lineNumber,
    pos: pos,
    ...(anchored === undefined ? {} : {fix: anchored}),
  }
}

module.exports = {
  metaOf,
  suppressed,
  defect,
}
