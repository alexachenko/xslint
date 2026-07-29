/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {tokenized, TOKENS} = require('../src/tokens')
const assert = require('assert')

/**
 * Cases where each input yields a first NUMBER token of an expected value.
 * @type {Array.<{name: string, inputs: Array.<string>,
 *  values: Array.<string>}>}
 */
const NUMBERS = [
  {
    name: 'checks the correct value of number with whitespaces around',
    inputs: ['w 123 q', 'w 123.1 q', 'w .1 q', 'w 123. q', 'w 1.5e10 q',
      'w 123e-45 q'],
    values: ['123', '123.1', '.1', '123.', '1.5e10', '123e-45'],
  },
  {
    name: 'checks the incorrect value of number with no whitespaces around',
    inputs: ['123.45.6', '123e45E6', '123e45.6', '1e', '1e+'],
    values: ['123.45', '123e45', '123e45', '1', '1'],
  },
]

/**
 * Cases where each input holds `count` tokens of the paired type.
 * @type {Array.<{name: string, count: number,
 *  pairs: Array.<[string, string]>}>}
 */
const SCANS = [
  {
    name: 'finds brackets and parentheses',
    count: 1,
    pairs: [
      ['( w e', TOKENS.LPAREN],
      ['w ) e', TOKENS.RPAREN],
      ['w [ e', TOKENS.LBRACKET],
      ['t t ]', TOKENS.RBRACKET],
    ],
  },
  {
    name: 'finds operators',
    count: 1,
    pairs: [
      ['+ w e', TOKENS.PLUS],
      ['w -e', TOKENS.MINUS],
      ['w 7*', TOKENS.MULTI],
      ['t = t', TOKENS.EQUAL],
      ['!= w e', TOKENS.NOT_EQUAL],
      ['t eq t', TOKENS.EQ],
      ['2div7', TOKENS.DIV],
      ['union w e', TOKENS.UNION],
      ['instance of', TOKENS.INSTANCE_OF],
    ],
  },
  {
    name: 'finds axes',
    count: 1,
    pairs: [
      ['child::abc', TOKENS.CHILD],
      ['descendant-or-self::def', TOKENS.DESCENDANT_OR_SELF],
      ['attribute::ghi', TOKENS.ATTRIBUTE],
    ],
  },
  {
    name: 'finds no axes',
    count: 0,
    pairs: [
      ['child:abc', TOKENS.CHILD],
      ['descendant-or-self', TOKENS.DESCENDANT_OR_SELF],
    ],
  },
]

/**
 * Fragments assembled into random expressions for the round-trip properties.
 * @type {Array.<string>}
 */
const PIECES = [
  'a', 'ns:n', '"x"', '\'a\'\'b\'', '(: c :)', '(: (:n:) :)', '123', '4.5',
  '.5', '1e3', 'child::', 'descendant-or-self::', '@', ' ', '  ', '\t',
  '\n', '//', '/', '(', ')', '[', ']', '*', '+', '-', '=', '!=', '<=',
  '>=', '|', '||', 'and', 'or', 'div', 'mod', 'instance of', '$v', ',', ':',
]

/**
 * A random expression built from one to twelve pieces.
 * @return {string} - The generated expression
 */
const generated = function() {
  let expression = ''
  const parts = 1 + Math.floor(Math.random() * 12)
  for (let part = 0; part < parts; part += 1) {
    expression += PIECES[Math.floor(Math.random() * PIECES.length)]
  }
  return expression
}

describe('tokens', function() {
  it('tokenizes a run of spaces as one whitespace token', function() {
    assert.equal(
      tokenized('a  b').find((token) => token.type === TOKENS.WHITESPACE).value,
      '  ',
    )
  })
  it('records the offset where a token starts', function() {
    assert.equal(
      tokenized('a  b').find((token) => token.type === TOKENS.WHITESPACE).start,
      1,
    )
  })
  it('keeps a string literal whole despite the spaces inside it', function() {
    assert.ok(
      tokenized('"a  b"').every((token) => token.type !== TOKENS.WHITESPACE),
    )
  })
  it('keeps a comment whole despite the spaces inside it', function() {
    assert.ok(
      tokenized('(: a  b :)').every((token) => token.type !== TOKENS.WHITESPACE),
    )
  })
  it('treats doubled quotes inside a literal as an escape', function() {
    assert.equal(tokenized('"a""b"').length, 1)
  })
  it('records the offset where a number starts', function() {
    assert.equal(
      tokenized('$a + 12').find((token) => token.type === TOKENS.NUMBER).start,
      5,
    )
  })
  NUMBERS.forEach(({name, inputs, values}) => {
    it(name, function() {
      inputs.forEach((string, index) => {
        assert.equal(
          tokenized(string).find((token) => token.type === TOKENS.NUMBER).value,
          values[index],
        )
      })
    })
  })
  SCANS.forEach(({name, count, pairs}) => {
    it(name, function() {
      pairs.forEach(([string, type]) => {
        assert.equal(
          tokenized(string).filter((token) => token.type === type).length,
          count,
        )
      })
    })
  })
  it('finds any user functions', function() {
    const VALUE = [
      'my:funct',
      'my3:funct',
      'w:foo',
      'q1r:function',
    ]
    const tokens = tokenized('my:funct() my3:funct() w:foo(e) q1r:function()')
      .filter((token) => token.type === TOKENS.USER_FUNCTION)
    tokens.forEach((token, index) => {
      assert.equal(token.value, VALUE[index])
    })
  })
  it('finds no user functions', function() {
    assert.ok(
      tokenized('foo(e) q1r:function q1r::function 3:funct() funct:()').filter((token) => token.type === TOKENS.USER_FUNCTION)
        .length === 0,
    )
  })
  it('reconstructs every generated expression from its tokens', function() {
    for (let count = 0; count < 500; count += 1) {
      const expression = generated()
      assert.equal(
        tokenized(expression).map((token) => token.value).join(''),
        expression,
      )
    }
  })
  it('positions generated expression tokens at contiguous offsets', function() {
    for (let count = 0; count < 500; count += 1) {
      const expression = generated()
      let offset = 0
      for (const token of tokenized(expression)) {
        assert.equal(token.start, offset)
        assert.ok(token.value.length > 0)
        offset += token.value.length
      }
    }
  })
})
