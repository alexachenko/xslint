/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {nodes} = require('./xpath')
const {tokenized, TOKENS} = require('./tokens')
const {yaml} = require('./helpers')
const path = require('path')
const {logger} = require('./logger')

/**
 * Name of the check this linter owns.
 * @type {string}
 */
const CHECK = 'use-node-set-extension'

/**
 * Defect metadata of the check.
 * @type {{severity: string, message: string}}
 */
const META = yaml.parsedFromFile(
  path.join(__dirname, 'resources', 'checks', 'format', `${CHECK}.yaml`),
)

/**
 * Names of the checks this linter owns.
 * @type {Array.<string>}
 */
const names = [CHECK]

/**
 * Stylesheet versions where the node-set() extension is redundant.
 * @type {Array.<string>}
 */
const MODERN = ['2.0', '3.0']

/**
 * Pattern of a `prefix:node-set(` call opener.
 * @type {RegExp}
 */
const CALL = /[\w.-]+:node-set\s*\(/g

/**
 * A select value with its string and comment spans blanked to spaces, so a
 * `node-set(` call can be found and its parentheses balanced without tripping
 * over text inside a literal. Blanking keeps every offset intact.
 * @param {string} select - The `select` attribute value
 * @return {string} - The value with literals blanked
 */
const masked = function(select) {
  const chars = Array.from(select)
  for (const token of tokenized(select)) {
    if (token.type === TOKENS.STRING || token.type === TOKENS.COMMENT) {
      for (let at = token.start; at < token.start + token.value.length; at++) {
        chars[at] = ' '
      }
    }
  }
  return chars.join('')
}

/**
 * Offset of the `)` that closes the `(` at `open` in a literal-free expression,
 * or -1 when it is unbalanced.
 * @param {string} expression - Expression with literals already blanked
 * @param {number} open - Offset of the opening `(`
 * @return {number} - Offset of the matching `)`, or -1
 */
const closes = function(expression, open) {
  let depth = 0
  for (let at = open; at < expression.length; at++) {
    if (expression[at] === '(') {
      depth++
    } else if (expression[at] === ')') {
      depth--
      if (depth === 0) {
        return at
      }
    }
  }
  return -1
}

/**
 * The node-set() wrappers in a select value: each carries the offset it starts
 * at, its verbatim text, and the inner argument that replaces it. A call whose
 * parentheses do not balance is skipped.
 * @param {string} select - The `select` attribute value
 * @return {Array.<{offset: number, value: string, replacement: string}>} -
 *  The node-set() calls found
 */
const wrappers = function(select) {
  const found = []
  const blanked = masked(select)
  for (const match of blanked.matchAll(CALL)) {
    const open = match.index + match[0].length - 1
    const close = closes(blanked, open)
    if (close >= 0) {
      found.push({
        offset: match.index,
        value: select.slice(match.index, close + 1),
        replacement: select.slice(open + 1, close),
      })
    }
  }
  return found
}

/**
 * Lint the corpus for the `node-set()` extension used in XSLT 2.0 or 3.0, where
 * a variable is already a node sequence, reporting one defect per call with the
 * fix that unwraps it.
 * @param {Array.<{file: string, xsl: Document}>} corpus - Parsed stylesheets
 * @param {Array.<string>} suppressions - Array of suppressed checks
 * @return {{name: string, severity: string, message: string, file: string,
 *  line: number, pos: number, fix: object}[]} - Defects found
 */
const lintByNodeSet = function(corpus, suppressions = []) {
  logger.debug(`Node-set linting started`)
  const defects = []
  if (!suppressions.some((sup) => CHECK.includes(sup))) {
    for (const {file, xsl} of corpus) {
      if (MODERN.includes(xsl.documentElement.getAttribute('version'))) {
        for (const attribute of nodes(xsl, '//@select')) {
          for (const {offset, value, replacement} of wrappers(
            attribute.nodeValue,
          )) {
            const pos = attribute.columnNumber + 1 + offset
            defects.push({
              name: CHECK,
              severity: META.severity,
              message: META.message,
              file: file,
              line: attribute.lineNumber,
              pos: pos,
              fix: {
                line: attribute.lineNumber,
                col: pos,
                value: value,
                replacement: replacement,
              },
            })
          }
        }
      }
    }
  }
  logger.debug(`Found ${defects.length} node-set extension defects`)
  return defects
}

module.exports = {
  lintByNodeSet,
  names,
}
