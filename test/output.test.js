/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {writer, colorful} = require('../src/output')
const assert = require('assert')

/**
 * Read colorful for a tty stream with NO_COLOR forced to a given state,
 * restoring the environment afterwards.
 * @param {string|undefined} value - NO_COLOR to set, or undefined to unset it
 * @return {boolean} - Whether coloring is enabled
 */
const withNoColor = function(value) {
  const saved = process.env.NO_COLOR
  if (value === undefined) {
    delete process.env.NO_COLOR
  } else {
    process.env.NO_COLOR = value
  }
  const result = colorful({isTTY: true})
  if (saved === undefined) {
    delete process.env.NO_COLOR
  } else {
    process.env.NO_COLOR = saved
  }
  return result
}

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
  it('does not color a stream that is not a terminal', function() {
    assert.equal(colorful({isTTY: false}), false)
  })
  it('colors a terminal when NO_COLOR is unset', function() {
    assert.ok(withNoColor(undefined))
  })
  it('does not color a terminal when NO_COLOR is set', function() {
    assert.ok(!withNoColor('1'))
  })
})
