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
const CHECK = 'string-length-compared-to-zero'

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
 * A `string-length(` call opener, unprefixed so a custom
 * `my:string-length()` is left alone.
 * @type {RegExp}
 */
const CALL = /(^|[^\w:.-])string-length\s*\(/g

/**
 * The comparison that follows the call: an operator and a `0` or `1` that turns
 * it into an emptiness test.
 * @type {RegExp}
 */
const TAIL = /^\s*(!=|<=|>=|=|<|>)\s*([01])(?![\w.])/

/**
 * The operand-reversed comparison sitting just before the call, `0 < ...`.
 * @type {RegExp}
 */
const HEAD = /(^|[^\w.])([01])\s*(!=|<=|>=|=|<|>)\s*$/

/**
 * Each operator with its sides swapped, so a reversed
 * `0 < string-length(x)` can be read as `string-length(x) > 0`.
 * @type {{[operator: string]: string}}
 */
const FLIP = {
  '<': '>', '>': '<', '<=': '>=', '>=': '<=', '=': '=', '!=': '!=',
}

/**
 * Whether the comparison tests for a non-empty string (`true`), an empty one
 * (`false`), or is a genuine length check that is left alone (`null`).
 * @param {string} operator - The comparison operator
 * @param {string} zero - The right-hand side, `0` or `1`
 * @return {?boolean} - Non-empty, empty, or null
 */
const empty = function(operator, zero) {
  if (zero === '0') {
    if (operator === '>' || operator === '!=') {
      return false
    }
    if (operator === '=' || operator === '<=') {
      return true
    }
  }
  if (zero === '1') {
    if (operator === '>=') {
      return false
    }
    if (operator === '<') {
      return true
    }
  }
  return null
}

/**
 * Whether an argument is a single operand that binds tighter than `!=`, so
 * `X != ''` keeps the original meaning. An argument carrying a top-level `|` or
 * space (a union or a binary operator) does not, and gets no fix.
 * @param {string} argument - The call's argument, already literal-blanked
 * @return {boolean} - Whether the argument is a simple operand
 */
const simple = function(argument) {
  let depth = 0
  for (const char of argument) {
    if (char === '(' || char === '[') {
      depth++
    } else if (char === ')' || char === ']') {
      depth--
    } else if (depth === 0 && (char === '|' || char === ' ')) {
      return false
    }
  }
  return true
}

/**
 * The emptiness test that replaces a comparison, or null when the argument is
 * not a simple operand and so cannot be rewritten with one edit.
 * @param {boolean} clean - Whether the argument is a simple operand
 * @param {string} argument - The call's argument
 * @param {boolean} hollow - Whether the comparison tests for an empty string
 * @return {?string} - The replacement expression, or null
 */
const replaced = function(clean, argument, hollow) {
  return clean ? `${argument} ${hollow ? '=' : '!='} ''` : null
}

/**
 * The `string-length(...)`-versus-zero comparisons in an expression, in either
 * operand order: each carries the offset it starts at, its verbatim text, and
 * the emptiness test that replaces it — or no replacement when the argument is
 * not a simple operand. A call whose parentheses do not balance, or that is
 * compared with anything but `0`/`1` in an emptiness-testing way, is skipped.
 * @param {string} expression - The attribute value
 * @return {Array.<{offset: number, value: string, replacement: ?string}>} -
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
    const clean = simple(blanked.slice(open + 1, close))
    const tail = TAIL.exec(blanked.slice(close + 1))
    const hollow = tail ? empty(tail[1], tail[2]) : null
    if (hollow !== null) {
      found.push({
        offset: start,
        value: expression.slice(start, close + 1 + tail[0].length),
        replacement: replaced(clean, argument, hollow),
      })
      continue
    }
    const head = HEAD.exec(blanked.slice(0, start))
    const reversed = head ? empty(FLIP[head[3]], head[2]) : null
    if (reversed !== null) {
      const from = start - head[0].length + head[1].length
      found.push({
        offset: from,
        value: expression.slice(from, close + 1),
        replacement: replaced(clean, argument, reversed),
      })
    }
  }
  return found
}

/**
 * Lint the corpus for `string-length(...)` compared with zero to test
 * emptiness, reporting one defect per comparison with the fix that rewrites it
 * to `X != ''` or `X = ''` when the argument is a simple operand.
 * @param {Array.<{file: string, xsl: Document}>} corpus - Parsed stylesheets
 * @param {Array.<string>} suppressions - Array of suppressed checks
 * @return {{name: string, severity: string, message: string, file: string,
 *  line: number, pos: number, fix: ?object}[]} - Defects found
 */
const lintByStringLength = function(corpus, suppressions = []) {
  logger.debug(`String-length-comparison linting started`)
  const defects = []
  if (!suppressions.some((sup) => CHECK.includes(sup))) {
    for (const {file, xsl} of corpus) {
      for (const attribute of nodes(xsl, '//@test | //@select')) {
        for (const {offset, value, replacement} of comparisons(
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
            fix: replacement === null ? undefined : {
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
  logger.debug(`Found ${defects.length} string-length comparison defects`)
  return defects
}

module.exports = {
  lintByStringLength,
  names,
}
