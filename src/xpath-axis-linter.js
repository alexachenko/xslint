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
const CHECK = 'unabbreviated-axis'

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
 * Attributes that hold an XPath expression or a pattern, the only places an
 * axis specifier can appear. Patterns (`match` and the grouping attributes) are
 * scanned too, so an axis in a template match is caught — the expression stream
 * the format linter reads leaves patterns out.
 * @type {Array.<string>}
 */
const ATTRIBUTES = [
  'select', 'test', 'use', 'value', 'group-by', 'group-adjacent', 'key',
  'initial-value', 'xpath', 'context-item', 'with-params', 'namespace-context',
  'match', 'count', 'from', 'group-starting-with', 'group-ending-with',
]

/**
 * XPath selecting every attribute an axis could live in, across the document.
 * @type {string}
 */
const SELECTOR = ATTRIBUTES.map((name) => `//@${name}`).join(' | ')

/**
 * The abbreviation of each single-token axis specifier.
 * @type {{[type: string]: {value: string, replacement: string}}}
 */
const SHORT = {
  [TOKENS.CHILD]: {value: 'child::', replacement: ''},
  [TOKENS.ATTRIBUTE]: {value: 'attribute::', replacement: '@'},
}

/**
 * Abbreviable axis specifiers in an expression. Each carries the offset where
 * it starts, its verbatim text, and the shorter form it becomes: `child::`
 * drops away, `attribute::` becomes `@`, and `parent::node()` becomes `..`. A
 * `parent::` with any other node test has no abbreviation and is left alone.
 * Axes inside string literals or comments are never seen because the lexer
 * keeps those whole.
 * @param {string} expression - Xpath expression or pattern
 * @return {Array.<{offset: number, value: string, replacement: string}>} - Axes
 */
const abbreviable = function(expression) {
  const found = []
  for (const token of tokenized(expression)) {
    if (SHORT[token.type]) {
      found.push({offset: token.start, ...SHORT[token.type]})
    } else if (
      token.type === TOKENS.PARENT &&
      expression.slice(token.start, token.start + 14) === 'parent::node()'
    ) {
      found.push({offset: token.start, value: 'parent::node()', replacement: '..'})
    }
  }
  return found
}

/**
 * Lint the corpus for axis specifiers that have a shorter form, reporting one
 * defect per occurrence with the fix that abbreviates it.
 * @param {Array.<{file: string, xsl: Document}>} corpus - Parsed stylesheets
 * @param {Array.<string>} suppressions - Array of suppressed checks
 * @return {{name: string, severity: string, message: string, file: string,
 *  line: number, pos: number, fix: object}[]} - Defects found
 */
const lintByAxis = function(corpus, suppressions = []) {
  logger.debug(`Axis linting started`)
  const defects = []
  if (!suppressions.some((sup) => CHECK.includes(sup))) {
    for (const {file, xsl} of corpus) {
      for (const attribute of nodes(xsl, SELECTOR)) {
        for (const {offset, value, replacement} of abbreviable(
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
  logger.debug(`Found ${defects.length} unabbreviated axis defects`)
  return defects
}

module.exports = {
  lintByAxis,
  names,
}
