/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {nodes} = require('./xpath')
const {masked, closes} = require('./expressions')
const {metaOf, suppressed, defect} = require('./checks')
const {logger} = require('./logger')

/**
 * Name of the check this linter owns.
 * @type {string}
 */
const CHECK = 'count-compared-to-zero'

/**
 * Defect metadata of the check.
 * @type {{severity: string, message: string}}
 */
const META = metaOf(CHECK)

/**
 * Names of the checks this linter owns.
 * @type {Array.<string>}
 */
const names = [CHECK]

/**
 * A `count(` call opener, unprefixed so a custom `my:count()` is left alone.
 * @type {RegExp}
 */
const CALL = /(^|[^\w:.-])count\s*\(/g

/**
 * The comparison that follows the call: an operator and a `0` or `1` that turns
 * the whole thing into an existence test.
 * @type {RegExp}
 */
const TAIL = /^\s*(!=|<=|>=|=|<|>)\s*([01])(?![\w.])/

/**
 * The operand-reversed comparison sitting just before a call: a `0` or `1` and
 * an operator, as in `0 < count(x)`. The leading group keeps the digit from
 * being the tail of a longer number.
 * @type {RegExp}
 */
const HEAD = /(^|[^\w.])([01])\s*(!=|<=|>=|=|<|>)\s*$/

/**
 * Each operator with its sides swapped, so a reversed `0 < count(x)` can be
 * read as `count(x) > 0` and fed to the same collapsing rule.
 * @type {{[operator: string]: string}}
 */
const FLIP = {
  '<': '>', '>': '<', '<=': '>=', '>=': '<=', '=': '=', '!=': '!=',
}

/**
 * The function a comparison collapses to, or null when it is a genuine count
 * rather than an existence test (`> 1`, `>= 0`, and the like).
 * @param {string} operator - The comparison operator
 * @param {string} zero - The right-hand side, `0` or `1`
 * @return {?string} - `exists`, `empty`, or null
 */
const collapses = function(operator, zero) {
  if (zero === '0') {
    if (operator === '>' || operator === '!=') {
      return 'exists'
    }
    if (operator === '=' || operator === '<=') {
      return 'empty'
    }
  }
  if (zero === '1') {
    if (operator === '>=') {
      return 'exists'
    }
    if (operator === '<') {
      return 'empty'
    }
  }
  return null
}

/**
 * The `count(...)`-versus-zero comparisons in an expression, in either operand
 * order (`count(x) > 0` and `0 < count(x)` alike): each carries the offset it
 * starts at, its verbatim text, and the existence test that replaces it. A call
 * whose parentheses do not balance, or that is compared with anything but
 * `0`/`1` in an existence-testing way, is skipped.
 * @param {string} expression - The attribute value
 * @return {Array.<{offset: number, value: string, replacement: string}>} -
 *  The comparisons found
 */
const comparisons = function(expression) {
  const found = []
  const blanked = masked(expression)
  for (const match of blanked.matchAll(CALL)) {
    const start = match.index + match[1].length
    const open = match.index + match[0].length - 1
    const close = closes(blanked, open)
    if (close < 0) {
      continue
    }
    const argument = expression.slice(open + 1, close)
    const tail = TAIL.exec(blanked.slice(close + 1))
    const test = tail && collapses(tail[1], tail[2])
    if (test) {
      found.push({
        offset: start,
        value: expression.slice(start, close + 1 + tail[0].length),
        replacement: `${test}(${argument})`,
      })
      continue
    }
    const head = HEAD.exec(blanked.slice(0, start))
    const reversed = head && collapses(FLIP[head[3]], head[2])
    if (reversed) {
      const from = start - head[0].length + head[1].length
      found.push({
        offset: from,
        value: expression.slice(from, close + 1),
        replacement: `${reversed}(${argument})`,
      })
    }
  }
  return found
}

/**
 * Lint the corpus for `count(...)` compared with zero to test existence,
 * reporting one defect per comparison with the fix that rewrites it to
 * `exists()` or `empty()`.
 * @param {Array.<{file: string, xsl: Document}>} corpus - Parsed stylesheets
 * @param {Array.<string>} suppressions - Array of suppressed checks
 * @return {{name: string, severity: string, message: string, file: string,
 *  line: number, pos: number, fix: object}[]} - Defects found
 */
const lintByCount = function(corpus, suppressions = []) {
  logger.debug(`Count-comparison linting started`)
  const defects = []
  if (!suppressed(CHECK, suppressions)) {
    for (const {file, xsl} of corpus) {
      for (const attribute of nodes(xsl, '//@test | //@select')) {
        for (const {offset, value, replacement} of comparisons(
          attribute.nodeValue,
        )) {
          defects.push(
            defect(CHECK, META, file, attribute, offset, {value, replacement}),
          )
        }
      }
    }
  }
  logger.debug(`Found ${defects.length} count comparison defects`)
  return defects
}

module.exports = {
  lintByCount,
  names,
}
