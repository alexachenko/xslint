/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {nodes} = require('./xpath')
const {masked, closes} = require('./expressions')
const {yaml} = require('./helpers')
const path = require('path')
const {logger} = require('./logger')

/**
 * Name of the check this linter owns.
 * @type {string}
 */
const CHECK = 'redundant-double-negation'

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
 * An unprefixed `not(` opener, so a custom `my:not()` is left alone.
 * @type {RegExp}
 */
const CALL = /(^|[^\w:.-])not\s*\(/g

/**
 * The inner `not(` that must open the outer `not`'s content.
 * @type {RegExp}
 */
const INNER = /^\s*not\s*\(/

/**
 * The double negations in an expression: an outer `not(...)` whose only content
 * is an inner `not(...)`. Each carries its start offset, verbatim text, and the
 * `boolean(...)` that replaces it — `not(not(x))` is `boolean(x)` in every
 * context, so the rewrite is always equivalent. A `not(` whose parentheses do
 * not balance, or whose content is more than a lone inner `not(...)`, is
 * skipped.
 * @param {string} expression - The attribute value
 * @return {Array.<{offset: number, value: string, replacement: string}>} -
 *  The negations found
 */
const negations = function(expression) {
  const found = []
  const blanked = masked(expression)
  for (const match of blanked.matchAll(CALL)) {
    const start = match.index + match[1].length
    const open = match.index + match[0].length - 1
    const close = closes(blanked, open)
    if (close < 0) {
      continue
    }
    const inner = INNER.exec(blanked.slice(open + 1, close))
    if (!inner) {
      continue
    }
    const innerOpen = open + inner[0].length
    const innerClose = closes(blanked, innerOpen)
    if (innerClose < 0 || blanked.slice(innerClose + 1, close).trim() !== '') {
      continue
    }
    found.push({
      offset: start,
      value: expression.slice(start, close + 1),
      replacement: `boolean(${expression.slice(innerOpen + 1, innerClose)})`,
    })
  }
  return found
}

/**
 * Lint the corpus for `not(not(x))`, a redundant double negation, reporting one
 * defect per occurrence with the safe fix that rewrites it to `boolean(x)`.
 * @param {Array.<{file: string, xsl: Document}>} corpus - Parsed stylesheets
 * @param {Array.<string>} suppressions - Array of suppressed checks
 * @return {{name: string, severity: string, message: string, file: string,
 *  line: number, pos: number, fix: object}[]} - Defects found
 */
const lintByDoubleNegation = function(corpus, suppressions = []) {
  logger.debug(`Double-negation linting started`)
  const defects = []
  if (!suppressions.some((sup) => CHECK.includes(sup))) {
    for (const {file, xsl} of corpus) {
      for (const attribute of nodes(xsl, '//@test | //@select')) {
        for (const {offset, value, replacement} of negations(
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
  logger.debug(`Found ${defects.length} double negations`)
  return defects
}

module.exports = {
  lintByDoubleNegation,
  names,
}
