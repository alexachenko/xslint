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
 * Apply the fixes carried by defects to their sources, returning the rewritten
 * content of each changed file and the defects whose fix was applied. Each fix
 * names a source span and its replacement; a fix is applied only when that span
 * still holds the exact text the fix expects, so a shifted offset — an entity
 * ahead of the run, an already-edited file — is skipped rather than corrupting
 * the source. Fixes for one file are applied from the end backwards so earlier
 * offsets stay valid.
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
      .map((defect) => ({
        defect: defect,
        start: offsetAt(content, defect.fix.line, defect.fix.col),
      }))
      .filter(({defect, start}) => {
        const matches =
          content.substr(start, defect.fix.value.length) === defect.fix.value
        if (!matches) {
          logger.warn(
            `Skipped fixing ${defect.name} at ${file}:${defect.fix.line}, ` +
            `the source no longer matches`,
          )
        }
        return matches
      })
      .sort((left, right) => right.start - left.start)
    if (edits.length > 0) {
      let text = content
      for (const {defect, start} of edits) {
        text =
          text.slice(0, start) +
          defect.fix.replacement +
          text.slice(start + defect.fix.value.length)
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
