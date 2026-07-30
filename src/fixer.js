/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {logger} = require('./logger')

/**
 * Absolute offset in a text of a one-based line and column.
 * @param {string} text - Source text
 * @param {number} line - One-based line number
 * @param {number} col - One-based column number
 * @return {number} - Zero-based offset into the text
 */
const offsetAt = function(text, line, col) {
  const lines = text.split('\n')
  let offset = col - 1
  for (let ln = 0; ln < line - 1; ln++) {
    offset += lines[ln].length + 1
  }
  return offset
}

/**
 * The named XML entities the source may spell a character with.
 * @type {{[name: string]: string}}
 */
const NAMED = {lt: '<', gt: '>', amp: '&', quot: '"', apos: '\''}

/**
 * The decoded character at a raw offset and the offset just past it, reading a
 * named XML entity (`&lt;`, `&gt;`, `&amp;`, …) as the single character it
 * stands for. Anything else an `&` opens (a numeric or unknown entity) yields
 * `undefined`, so a match over it fails and the fix is safely skipped rather
 * than decoded wrongly.
 * @param {string} content - Raw source text
 * @param {number} at - Zero-based offset to read from
 * @return {[(string|undefined), number]} - The decoded character (or undefined)
 *  and the next raw offset
 */
const character = function(content, at) {
  if (content[at] !== '&') {
    return [content[at], at + 1]
  }
  const end = content.indexOf(';', at)
  return [NAMED[content.slice(at + 1, end)], end + 1]
}

/**
 * The raw offset reached by decoding `count` characters forward from `at`, so a
 * decoded offset into an attribute value maps to its true raw position even
 * when an entity ahead of it spans several source characters.
 * @param {string} content - Raw source text
 * @param {number} at - Zero-based offset to start from
 * @param {number} count - Number of decoded characters to skip
 * @return {number} - The raw offset after `count` decoded characters
 */
const skip = function(content, at, count) {
  let raw = at
  for (let seen = 0; seen < count; seen++) {
    raw = character(content, raw)[1]
  }
  return raw
}

/**
 * The raw offset just past the source that decodes to `value` starting at
 * `from`, or `-1` when the source there does not decode to `value` (an
 * already-edited file). Decoding as it walks matches a `>` written `&gt;` or
 * literally alike.
 * @param {string} content - Raw source text
 * @param {number} from - Zero-based offset to match from
 * @param {string} value - The decoded fix value
 * @return {number} - The raw offset after the match, or -1
 */
const decodes = function(content, from, value) {
  let raw = from
  for (const char of value) {
    if (raw >= content.length) {
      return -1
    }
    const [decoded, next] = character(content, raw)
    if (decoded !== char) {
      return -1
    }
    raw = next
  }
  return raw
}

/**
 * Apply the fixes carried by defects to their sources, returning the rewritten
 * content of each changed file and the defects whose fix was applied. Each fix
 * names a source position, a decoded `value`, and its replacement. The fixer
 * decode-walks the raw source from the node's raw start (`col - offset`) by the
 * fix's decoded `offset`, so it lands on the match even when an entity ahead of
 * it shifts the column, then matches `value` decoding as it goes — a `>`
 * written `&gt;` matches alike. A fix whose source no longer decodes to `value`
 * (an already-edited file) is skipped rather than corrupting. Fixes for one
 * file are applied from the end backwards so earlier offsets stay valid.
 * @param {Array.<{file: string, content: string}>} sources - Original sources
 * @param {Array.<{file: string, fix: {line: number, col: number, offset:
 *  number, value: string, replacement: string, suggestion: boolean}}>}
 *  defects - Defects; only those carrying a `fix` are fixed (`offset`
 *  defaults to 0)
 * @param {boolean} suggestions - Whether to also apply the fixes marked as
 *  suggestions, not just the safe ones
 * @return {{contents: Map.<string, string>, applied: Array.<object>}} - The
 *  rewritten content by file and the defects that were applied
 */
const fixed = function(sources, defects, suggestions = false) {
  const fixable = defects.filter(
    (defect) => defect.fix && (suggestions || !defect.fix.suggestion),
  )
  const contents = new Map()
  const applied = []
  for (const {file, content} of sources) {
    const edits = fixable
      .filter((defect) => defect.file === file)
      .map((defect) => {
        const offset = defect.fix.offset || 0
        const base = offsetAt(content, defect.fix.line, defect.fix.col - offset)
        const start = skip(content, base, offset)
        return {
          defect: defect,
          start: start,
          end: decodes(content, start, defect.fix.value),
        }
      })
      .filter(({defect, end}) => {
        if (end < 0) {
          logger.warn(
            `Skipped fixing ${defect.name} at ${file}:${defect.fix.line}, ` +
            `the source no longer matches`,
          )
        }
        return end >= 0
      })
      .sort((left, right) => right.start - left.start)
    if (edits.length > 0) {
      let text = content
      for (const {defect, start, end} of edits) {
        text =
          text.slice(0, start) +
          defect.fix.replacement +
          text.slice(end)
        applied.push(defect)
      }
      contents.set(file, text)
    }
  }
  return {contents: contents, applied: applied}
}

module.exports = {
  fixed,
}
