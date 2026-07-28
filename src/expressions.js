/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {tokenized, TOKENS} = require('./tokens')

/**
 * An expression with its string and comment spans blanked to spaces, so a call
 * can be found and its parentheses balanced without tripping over text inside a
 * literal. Blanking keeps every offset intact.
 * @param {string} expression - The attribute value
 * @return {string} - The value with literals blanked
 */
const masked = function(expression) {
  const chars = Array.from(expression)
  for (const token of tokenized(expression)) {
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

module.exports = {
  masked,
  closes,
}
