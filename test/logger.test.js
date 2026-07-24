/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {logger, levels} = require('../src/logger')
const assert = require('assert')

/**
 * Set the level, run a logging action, and capture what reaches the console,
 * restoring the default level afterwards so no state leaks to other files.
 * @param {string} level - Level to set first
 * @param {function(): void} act - Logging to run
 * @return {string} - The captured output
 */
const captured = function(level, act) {
  const original = console.error
  const lines = []
  console.error = (...args) => lines.push(args.join(' '))
  try {
    logger.setLevel(level)
    act()
  } finally {
    console.error = original
    logger.setLevel(levels.INFO)
  }
  return lines.join('\n')
}

describe('logger', function() {
  it('emits a debug line when the level allows it', function() {
    assert.ok(captured(levels.DEBUG, () => logger.debug('dbg')).includes('dbg'))
  })
  it('drops an info line above its level', function() {
    assert.ok(!captured(levels.ERROR, () => logger.info('inf')).includes('inf'))
  })
  it('drops a warning above its level', function() {
    assert.ok(!captured(levels.ERROR, () => logger.warn('wrn')).includes('wrn'))
  })
  it('always emits an error line', function() {
    assert.ok(captured(levels.ERROR, () => logger.error('err')).includes('err'))
  })
  it('warns about an unknown level', function() {
    assert.ok(
      captured(levels.DEBUG, () => logger.setLevel('nonsense'))
        .includes('incorrect'),
    )
  })
})
