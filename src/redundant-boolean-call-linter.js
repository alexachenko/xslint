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
const CHECK = 'redundant-boolean-call'

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
 * An unprefixed `boolean(` at the very start of the expression, so a custom
 * `my:boolean()` or a `boolean()` nested in a larger expression is left alone.
 * @type {RegExp}
 */
const WRAPPER = /^\s*boolean\s*\(/

/**
 * The redundant `boolean(...)` wrapping a whole `@test`, or null when the test
 * is not a single `boolean(...)` call. In a test the value is already coerced
 * to a boolean, so the wrapper adds nothing and its argument stands alone. A
 * `boolean(...)` that is only part of a larger expression (`a = boolean(b)`) is
 * left alone, since there the coercion can matter. The replacement is the
 * argument trimmed, so `boolean( x )` reduces to `x` and never leaves the
 * surrounding whitespace that `redundant-whitespace` would then flag.
 * @param {string} test - The `@test` value
 * @return {?{offset: number, value: string, replacement: string}} - The strip
 */
const stripped = function(test) {
  const blanked = masked(test)
  const wrapper = WRAPPER.exec(blanked)
  if (!wrapper) {
    return null
  }
  const open = wrapper[0].length - 1
  const close = closes(blanked, open)
  if (close < 0 || blanked.slice(close + 1).trim() !== '') {
    return null
  }
  const offset = wrapper[0].indexOf('boolean')
  return {
    offset: offset,
    value: test.slice(offset, close + 1),
    replacement: test.slice(open + 1, close).trim(),
  }
}

/**
 * Lint the corpus for a whole `@test` that is a single `boolean(...)` call,
 * reporting one defect per test with the safe fix that strips the wrapper.
 * @param {Array.<{file: string, xsl: Document}>} corpus - Parsed stylesheets
 * @param {Array.<string>} suppressions - Array of suppressed checks
 * @return {{name: string, severity: string, message: string, file: string,
 *  line: number, pos: number, fix: object}[]} - Defects found
 */
const lintByBooleanCall = function(corpus, suppressions = []) {
  logger.debug(`Boolean-call linting started`)
  const defects = []
  if (!suppressions.some((sup) => CHECK.includes(sup))) {
    for (const {file, xsl} of corpus) {
      for (const attribute of nodes(xsl, '//@test')) {
        const strip = stripped(attribute.nodeValue)
        if (strip) {
          const pos = attribute.columnNumber + 1 + strip.offset
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
              value: strip.value,
              replacement: strip.replacement,
            },
          })
        }
      }
    }
  }
  logger.debug(`Found ${defects.length} redundant boolean calls`)
  return defects
}

module.exports = {
  lintByBooleanCall,
  names,
}
