/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {directivesFrom, suppresses, unused} = require('../src/directives')
const assert = require('assert')

/**
 * Cases where the first directive parsed from a text has an expected shape.
 * @type {Array.<{name: string, text: string, expected: object}>}
 */
const PARSED = [
  {
    name: 'reads a disable-next-line directive with its line and names',
    text: 'a\nb\n<!-- xslint-disable-next-line short-names -->\n',
    expected: {type: 'disable-next-line', line: 3, names: ['short-names']},
  },
  {
    name: 'reads a nameless disable-file directive as covering everything',
    text: '<!-- xslint-disable-file -->\n',
    expected: {type: 'disable-file', line: 1, names: []},
  },
]

/**
 * Cases where directives do or do not suppress a defect.
 * @type {Array.<{name: string, directives: Array.<object>, defect: object,
 *  expected: boolean}>}
 */
const SUPPRESSED = [
  {
    name: 'suppresses a defect on the line after a disable-next-line',
    directives: [{type: 'disable-next-line', line: 3, names: ['short-names']}],
    defect: {name: 'short-names', line: 4},
    expected: true,
  },
  {
    name: 'does not suppress a defect the directive does not name',
    directives: [{type: 'disable-next-line', line: 3, names: ['short-names']}],
    defect: {name: 'unused-variable', line: 4},
    expected: false,
  },
  {
    name: 'suppresses any defect in the file for a disable-file',
    directives: [{type: 'disable-file', line: 1, names: []}],
    defect: {name: 'anything', line: 99},
    expected: true,
  },
  {
    name: 'does not suppress a defect on another line',
    directives: [{type: 'disable-line', line: 5, names: []}],
    defect: {name: 'short-names', line: 6},
    expected: false,
  },
]

/**
 * Cases where a directive is or is not reported as unused.
 * @type {Array.<{name: string, directives: Array.<object>,
 *  defects: Array.<object>, expected: Array.<object>}>}
 */
const UNUSED = [
  {
    name: 'reports a directive that covers no defect as unused',
    directives: [{type: 'disable-next-line', line: 3, names: ['short-names']}],
    defects: [{name: 'short-names', line: 9}],
    expected: [{type: 'disable-next-line', line: 3, names: ['short-names']}],
  },
  {
    name: 'does not report a directive that covers a defect as unused',
    directives: [{type: 'disable-next-line', line: 3, names: ['short-names']}],
    defects: [{name: 'short-names', line: 4}],
    expected: [],
  },
]

describe('directives', function() {
  PARSED.forEach(({name, text, expected}) => {
    it(name, function() {
      assert.deepStrictEqual(directivesFrom(text)[0], expected)
    })
  })
  SUPPRESSED.forEach(({name, directives, defect, expected}) => {
    it(name, function() {
      assert.equal(Boolean(suppresses(directives, defect)), expected)
    })
  })
  UNUSED.forEach(({name, directives, defects, expected}) => {
    it(name, function() {
      assert.deepStrictEqual(unused(directives, defects), expected)
    })
  })
})
