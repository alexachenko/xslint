/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {writer} = require('../src/output')
const assert = require('assert')

/**
 * The ANSI escape character, present in colored output and absent in plain.
 * @type {string}
 */
const ESC = String.fromCharCode(27)

describe('output', function() {
  it('colors a line when coloring is enabled', function() {
    const lines = []
    writer((line) => lines.push(line), true).error('boom')
    assert.ok(lines[0].includes(ESC))
  })
  it('leaves a line plain when coloring is disabled', function() {
    const lines = []
    writer((line) => lines.push(line), false).error('boom')
    assert.ok(!lines[0].includes(ESC))
  })
})
