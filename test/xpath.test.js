/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {isValid} = require('../src/xpath')
const assert = require('assert')

describe('xpath', function() {
  it('accepts a syntactically valid expression', function() {
    assert.ok(isValid('count(//o) = 2'))
  })
  it('rejects a syntactically invalid expression', function() {
    assert.ok(!isValid('1 +'))
  })
  it('resolves a standard namespace prefix', function() {
    assert.ok(isValid('xsl:thing'))
  })
  it('resolves a non-standard namespace prefix rather than failing', function() {
    assert.ok(isValid('zq:thing'))
  })
})
