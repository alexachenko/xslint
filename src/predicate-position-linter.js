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
const CHECK = 'predicate-position-literal'

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
 * Attributes that hold an XPath expression or a pattern, the only places a
 * predicate can appear — patterns (`match` and the grouping attributes) among
 * them, so a positional predicate in a template match is caught too.
 * @type {Array.<string>}
 */
const ATTRIBUTES = [
  'select', 'test', 'use', 'value', 'group-by', 'group-adjacent', 'key',
  'initial-value', 'xpath', 'context-item', 'with-params', 'namespace-context',
  'match', 'count', 'from', 'group-starting-with', 'group-ending-with',
]

/**
 * XPath selecting every attribute a predicate could live in, across the
 * document.
 * @type {string}
 */
const SELECTOR = ATTRIBUTES.map((name) => `//@${name}`).join(' | ')

/**
 * One-character symbol standing for a significant token, so a predicate's
 * contents reduce to a short signature the matcher compares against.
 * @type {{[type: string]: string}}
 */
const SIGN = {
  [TOKENS.LPAREN]: '(',
  [TOKENS.RPAREN]: ')',
  [TOKENS.EQUAL]: '=',
  [TOKENS.NUMBER]: 'N',
}

/**
 * The signature symbol of one token: `P` for `position`, `L` for `last`, the
 * mapped punctuation for a bracket/paren/equals/number, and `x` for anything
 * else — an `x` in a signature is what keeps `[position() = 1 and @y]` from
 * matching.
 * @param {{type: string, value: string}} token - The token
 * @return {string} - Its one-character signature symbol
 */
const symbol = function(token) {
  if (token.type === TOKENS.OTHER && token.value === 'position') {
    return 'P'
  }
  if (token.type === TOKENS.OTHER && token.value === 'last') {
    return 'L'
  }
  return SIGN[token.type] || 'x'
}

/**
 * The literal a positional predicate reduces to, or null when the predicate is
 * not a lone `position()` comparison. `[position() = N]` and `[N = position()]`
 * become the number `N`; `[position() = last()]` and `[last() = position()]`
 * become `last()`. Anything else — an extra operand, a different function, a
 * comparison other than `=` — yields null.
 * @param {Array.<{type: string, value: string}>} significant - The predicate's
 *  tokens, whitespace and comments already dropped
 * @return {?string} - The short form, or null
 */
const shortened = function(significant) {
  const sign = significant.map(symbol).join('')
  if (sign === 'P()=N' || sign === 'N=P()') {
    return significant.find((token) => token.type === TOKENS.NUMBER).value
  }
  if (sign === 'P()=L()' || sign === 'L()=P()') {
    return 'last()'
  }
  return null
}

/**
 * The positional predicates in an expression written the long way. Each carries
 * the offset just inside its `[`, the verbatim contents of the brackets, and
 * the short form that replaces them — so `foo[position() = 1]` becomes `foo[1]`
 * and `foo[position() = last()]` becomes `foo[last()]`. Brackets are matched
 * through a stack, so a nested predicate is judged on its own contents and an
 * outer predicate that merely wraps one is left alone; a `[` inside a string or
 * comment is never seen, since the lexer keeps those whole.
 * @param {string} expression - Xpath expression or pattern
 * @return {Array.<{offset: number, value: string, replacement: string}>} -
 *  The predicates found
 */
const literals = function(expression) {
  const tokens = tokenized(expression)
  const found = []
  const opens = []
  for (let ind = 0; ind < tokens.length; ind++) {
    if (tokens[ind].type === TOKENS.LBRACKET) {
      opens.push(ind)
    } else if (tokens[ind].type === TOKENS.RBRACKET && opens.length) {
      const open = opens.pop()
      const replacement = shortened(
        tokens.slice(open + 1, ind).filter(
          (token) => token.type !== TOKENS.WHITESPACE &&
            token.type !== TOKENS.COMMENT,
        ),
      )
      if (replacement !== null) {
        const offset = tokens[open].start + 1
        found.push({
          offset: offset,
          value: expression.slice(offset, tokens[ind].start),
          replacement: replacement,
        })
      }
    }
  }
  return found
}

/**
 * Lint the corpus for a positional predicate written the long way, reporting
 * one defect per occurrence with a safe fix that rewrites the predicate to its
 * numeric or `last()` short form.
 * @param {Array.<{file: string, xsl: Document}>} corpus - Parsed stylesheets
 * @param {Array.<string>} suppressions - Array of suppressed checks
 * @return {{name: string, severity: string, message: string, file: string,
 *  line: number, pos: number, fix: object}[]} - Defects found
 */
const lintByPredicatePosition = function(corpus, suppressions = []) {
  logger.debug(`Predicate-position linting started`)
  const defects = []
  if (!suppressions.some((sup) => CHECK.includes(sup))) {
    for (const {file, xsl} of corpus) {
      for (const attribute of nodes(xsl, SELECTOR)) {
        for (const {offset, value, replacement} of literals(
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
  logger.debug(`Found ${defects.length} positional predicate defects`)
  return defects
}

module.exports = {
  lintByPredicatePosition,
  names,
}
