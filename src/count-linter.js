/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {nodes} = require('./xpath')
const {comparedToZero} = require('./comparisons')
const {metaOf, suppressed, defect} = require('./checks')
const {SELECTOR} = require('./attributes')
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
 * Stylesheet versions where `exists()`/`empty()` exist, so the rewrite is
 * available. The smell is worth reporting on any version, but the fix is not.
 * @type {Array.<string>}
 */
const MODERN = ['2.0', '3.0']

/**
 * The existence function a comparison collapses to, or null when it is a
 * genuine count rather than an existence test (`> 1`, `>= 0`, and the like).
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
 * Classify a `count(...)`-versus-`0`/`1` comparison for `comparedToZero`: an
 * existence test collapses to `exists(argument)`/`empty(argument)`, anything
 * else is left alone.
 * @param {string} operator - The comparison operator
 * @param {string} zero - The compared digit, `0` or `1`
 * @param {string} argument - The call's argument
 * @return {?{replacement: string}} - The rewrite, or null when not existence
 */
const decide = function(operator, zero, argument) {
  const test = collapses(operator, zero)
  return test ? {replacement: `${test}(${argument})`} : null
}

/**
 * The `count(...)`-versus-zero existence tests in an expression, in either
 * operand order (`count(x) > 0` and `0 < count(x)` alike).
 * @param {string} expression - The attribute value
 * @return {Array.<{offset: number, value: string, replacement: string}>} -
 *  The comparisons found
 */
const comparisons = function(expression) {
  return comparedToZero(expression, 'count', decide)
}

/**
 * Lint the corpus for `count(...)` compared with zero to test existence,
 * reporting one defect per comparison. The `exists()`/`empty()` fix is attached
 * only on an XSLT 2.0/3.0 stylesheet, where those functions exist; on 1.0 the
 * smell is still reported, without a fix.
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
      const modern = MODERN.includes(
        xsl.documentElement.getAttribute('version'),
      )
      for (const attribute of nodes(xsl, SELECTOR)) {
        for (const {offset, value, replacement} of comparisons(
          attribute.nodeValue,
        )) {
          defects.push(
            defect(
              CHECK, META, file, attribute, offset,
              modern ? {value, replacement} : undefined,
            ),
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
