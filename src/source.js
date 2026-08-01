/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

/**
 * The named XML entities the source may spell a character with.
 * @type {{[name: string]: string}}
 */
const NAMED = {lt: '<', gt: '>', amp: '&', quot: '"', apos: '\''}

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
 * The one-based line and column of an absolute offset, which is the reverse of
 * {@link offsetAt} and the shape a defect is reported in.
 * @param {string} text - Source text
 * @param {number} at - Zero-based offset into the text
 * @return {{line: number, pos: number}} - Where that offset stands
 */
const placeAt = function(text, at) {
  const before = text.slice(0, at)
  const newline = before.lastIndexOf('\n')
  return {
    line: before.split('\n').length,
    pos: at - newline,
  }
}

/**
 * The decoded character at a raw offset and the offset just past it, reading a
 * named XML entity (`&lt;`, `&gt;`, `&amp;`, …) as the single character it
 * stands for. Anything else an `&` opens (a numeric or unknown entity) yields
 * `undefined`, so a match over it fails and the caller can back off rather than
 * decode it wrongly.
 * @param {string} content - Raw source text
 * @param {number} at - Zero-based offset to read from
 * @return {[(string|undefined), number]} - The decoded character (or undefined)
 *  and the next raw offset
 */
const character = function(content, at) {
  const entity = content[at] === '&'
  const end = entity ? content.indexOf(';', at) : at
  return entity ?
    [NAMED[content.slice(at + 1, end)], end + 1] :
    [content[at], at + 1]
}

/**
 * The raw offset reached after skipping the given number of decoded characters,
 * so an offset into a parsed value maps back to its true place in the source
 * even when an entity ahead of it spans several source characters.
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

module.exports = {
  NAMED,
  offsetAt,
  placeAt,
  character,
  skip,
}
