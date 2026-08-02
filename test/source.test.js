/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {character, offsetAt, placeAt, skip} = require('../src/source')
const assert = require('assert')

/**
 * Raw texts paired with what the character at an offset decodes to and where
 * the walk resumes, so the count a position is built on is pinned per spelling.
 * @type {Array.<{name: string, content: string, at: number,
 *  decoded: (string|undefined), next: number}>}
 */
const CHARACTERS = [
  {
    name: 'reads a plain character as itself',
    content: 'abc', at: 1, decoded: 'b', next: 2,
  },
  {
    name: 'reads a named entity as the one character it stands for',
    content: 'a&gt;b', at: 1, decoded: '>', next: 5,
  },
  {
    name: 'reads a CRLF line ending as the newline a parser leaves',
    content: 'a\r\nb', at: 1, decoded: '\n', next: 3,
  },
  {
    name: 'reads a lone carriage return as a newline too',
    content: 'a\rb', at: 1, decoded: '\n', next: 2,
  },
  {
    name: 'reads a newline as itself',
    content: 'a\nb', at: 1, decoded: '\n', next: 2,
  },
  {
    name: 'refuses an entity no semicolon closes',
    content: 'a&gt', at: 1, decoded: undefined, next: 2,
  },
  {
    name: 'refuses an entity it does not know',
    content: 'a&#65;b', at: 1, decoded: undefined, next: 6,
  },
]

/**
 * Texts paired with how far a walk of the given length reaches, which is what
 * keeps a defect on the character it stands on.
 * @type {Array.<{name: string, content: string, count: number, raw: number}>}
 */
const WALKS = [
  {
    name: 'counts a CRLF line ending as the one character it becomes',
    content: 'ab\r\ncd', count: 4, raw: 5,
  },
  {
    name: 'counts three CRLF endings as three characters',
    content: 'a\r\nb\r\nc\r\nd', count: 6, raw: 9,
  },
  {
    name: 'counts an entity as the one character it becomes',
    content: 'a&amp;b', count: 2, raw: 6,
  },
  {
    name: 'counts a plain run one for one',
    content: 'abcdef', count: 3, raw: 3,
  },
]

describe('source', function() {
  CHARACTERS.forEach((one) => {
    it(one.name, function() {
      assert.deepStrictEqual(
        character(one.content, one.at),
        [one.decoded, one.next],
      )
    })
  })
  WALKS.forEach((one) => {
    it(one.name, function() {
      assert.equal(skip(one.content, 0, one.count), one.raw)
    })
  })
  it('turns a line and column into an offset', function() {
    assert.equal(offsetAt('ab\ncde\nf', 2, 3), 5)
  })
  it('turns an offset back into a line and column', function() {
    assert.deepStrictEqual(placeAt('ab\ncde\nf', 5), {line: 2, pos: 3})
  })
})
