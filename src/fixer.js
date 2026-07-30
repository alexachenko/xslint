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
 * The entity forms each XML-significant character can take in the source.
 * @type {{[char: string]: string}}
 */
const ENTITIES = {
  '&': '(?:&amp;|&)',
  '<': '(?:&lt;|<)',
  '>': '(?:&gt;|>)',
}

/**
 * A sticky regex matching a fix's `value` against the raw source. The value is
 * sliced from the decoded attribute text, but the source is XML, where `&`,
 * `<`, and `>` may be written either literally (a raw `>` is legal in an
 * attribute) or as an entity (`&gt;`) — so each of those characters matches
 * both forms. Every other character is matched literally, with regex
 * metacharacters escaped.
 * @param {string} value - The decoded fix value
 * @return {RegExp} - A sticky regex anchored wherever its `lastIndex` is set
 */
const matcher = function(value) {
  return new RegExp(
    value
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/[&<>]/g, (char) => ENTITIES[char]),
    'y',
  )
}

/**
 * The length of the raw source span at `start` that a fix's `value` matches, or
 * `-1` when the source there does not match (an already-edited file, or a
 * position an entity earlier in the same value has shifted). The match is
 * entity-flexible, so a decoded `count(x) > 0` fixes both the raw-`>` and the
 * `&gt;`-encoded source; a non-match is skipped rather than corrupting.
 * @param {string} content - Raw source text
 * @param {number} start - Zero-based offset to match at
 * @param {string} value - The decoded fix value
 * @return {number} - The raw span length, or -1 when it does not match
 */
const spanAt = function(content, start, value) {
  const regex = matcher(value)
  regex.lastIndex = start
  const found = regex.exec(content)
  return found === null ? -1 : found[0].length
}

/**
 * Apply the fixes carried by defects to their sources, returning the rewritten
 * content of each changed file and the defects whose fix was applied. Each fix
 * names a source span and its replacement; a fix is applied only when that span
 * still matches the text the fix expects — entity-flexibly, so a `>` written
 * `&gt;` still matches — otherwise it is skipped rather than corrupting the
 * source (an already-edited file, or a position an earlier entity has shifted).
 * Fixes for one file are applied from the end backwards so earlier offsets stay
 * valid.
 * @param {Array.<{file: string, content: string}>} sources - Original sources
 * @param {Array.<{file: string, fix: {line: number, col: number, value: string,
 *  replacement: string, suggestion: boolean}}>} defects - Defects, only those
 *  carrying a `fix` fixed
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
        const start = offsetAt(content, defect.fix.line, defect.fix.col)
        return {
          defect: defect,
          start: start,
          span: spanAt(content, start, defect.fix.value),
        }
      })
      .filter(({defect, span}) => {
        if (span < 0) {
          logger.warn(
            `Skipped fixing ${defect.name} at ${file}:${defect.fix.line}, ` +
            `the source no longer matches`,
          )
        }
        return span >= 0
      })
      .sort((left, right) => right.start - left.start)
    if (edits.length > 0) {
      let text = content
      for (const {defect, start, span} of edits) {
        text =
          text.slice(0, start) +
          defect.fix.replacement +
          text.slice(start + span)
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
