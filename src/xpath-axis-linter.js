/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {tokenized, TOKENS} = require('./tokens')
const {metaOf, suppressed, defect} = require('./checks')
const {expressionsOf} = require('./attributes')
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
const META = metaOf(CHECK)

/**
 * Names of the checks this linter owns.
 * @type {Array.<string>}
 */
const names = [CHECK]

/**
 * The abbreviation each axis specifier collapses to on its own, whatever node
 * test follows it. The verbatim text comes from the token, so a spaced
 * `child ::` is stripped in full rather than leaving its whitespace behind.
 * @type {{[type: string]: {replacement: string}}}
 */
const SHORT = {
  [TOKENS.CHILD]: {replacement: ''},
  [TOKENS.ATTRIBUTE]: {replacement: '@'},
}

/**
 * The abbreviation each axis collapses to when — and only when — its node test
 * is `node()`, in which case the whole step goes. The same axis before any
 * other node test names a kind of node rather than every one, so it keeps its
 * longhand.
 * @type {{[type: string]: {replacement: string}}}
 */
const STEP = {
  [TOKENS.PARENT]: {replacement: '..'},
  [TOKENS.SELF]: {replacement: '.'},
}

/**
 * How many tokens a `node()` test can span once the whitespace XPath allows
 * between its pieces is counted in: the name, the two parentheses, and a run
 * of whitespace before each.
 * @type {number}
 */
const SPAN = 6

/**
 * Offset just past the `node()` test that follows the axis token at the given
 * index, or null when the axis carries another node test. The whitespace XPath
 * allows between the pieces is insignificant, so `node ( )` names the same
 * test as `node()`.
 * @param {Array.<{type: string, value: string, start: number}>} tokens - Tokens
 * @param {number} index - Index of the axis token
 * @return {?number} - Offset just past the closing parenthesis
 */
const afterNode = function(tokens, index) {
  const rest = tokens.slice(index + 1, index + 1 + SPAN).filter(
    (token) => token.type !== TOKENS.WHITESPACE,
  )
  const shaped = rest.length >= 3 &&
    rest[0].type === TOKENS.OTHER && rest[0].value === 'node' &&
    rest[1].type === TOKENS.LPAREN && rest[2].type === TOKENS.RPAREN
  return shaped ? rest[2].start + 1 : null
}

/**
 * Abbreviable axis specifiers in an expression. Each carries the offset where
 * it starts, its verbatim text, and the shorter form it becomes: `child::`
 * drops away, `attribute::` becomes `@`, `parent::node()` becomes `..`, and
 * `self::node()` becomes `.`. Those four are the whole of it — a `parent::` or
 * `self::` before any other node test has no shorter form, and neither has any
 * remaining axis, `descendant-or-self::node()` aside, whose `//` trades a
 * named step for a whole-tree walk. Axes inside string literals or comments
 * are never seen because the lexer keeps those whole.
 * @param {string} expression - Xpath expression or pattern
 * @return {Array.<{offset: number, value: string, replacement: string}>} - Axes
 */
const abbreviable = function(expression) {
  const tokens = tokenized(expression)
  const found = []
  tokens.forEach((token, index) => {
    const end = STEP[token.type] ? afterNode(tokens, index) : null
    if (SHORT[token.type]) {
      found.push({
        offset: token.start,
        value: token.value,
        replacement: SHORT[token.type].replacement,
      })
    } else if (end !== null) {
      found.push({
        offset: token.start,
        value: expression.slice(token.start, end),
        replacement: STEP[token.type].replacement,
      })
    }
  })
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
  if (!suppressed(CHECK, suppressions)) {
    for (const {file, xsl} of corpus) {
      for (const {node, start, expression} of expressionsOf(xsl)) {
        for (const {offset, value, replacement} of abbreviable(expression)) {
          defects.push(
            defect(
              CHECK, META, file, node, start + offset, {value, replacement},
            ),
          )
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
