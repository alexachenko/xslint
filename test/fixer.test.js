/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {runXslint, xslintStreams} = require('./helpers')
const {fixed} = require('../src/fixer')
const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

/**
 * A stylesheet carrying redundant whitespace, copied into a temporary file so
 * a fixing run never mutates the committed fixture.
 * @type {string}
 */
const dirty = fs.readFileSync(
  path.resolve(__dirname, 'resources', 'fix', 'redundant-whitespace.xsl'),
  'utf-8',
)

/**
 * The same stylesheet with every redundant whitespace run collapsed or trimmed.
 * @type {string}
 */
const clean = fs.readFileSync(
  path.resolve(__dirname, 'resources', 'fix', 'redundant-whitespace.fixed.xsl'),
  'utf-8',
)

/**
 * Copy the dirty fixture into a fresh temporary file and return its path.
 * @return {string} - Path of the temporary stylesheet
 */
const scratch = function() {
  const file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'xslint-fix-')),
    'sheet.xsl',
  )
  fs.writeFileSync(file, dirty)
  return file
}

describe('fixer', function() {
  it('should collapse redundant whitespace in place with --fix', function() {
    const file = scratch()
    runXslint(['--fix', file])
    assert.equal(fs.readFileSync(file, 'utf-8'), clean)
  })
  it('cannot touch the file with --fix-dry-run', function() {
    const file = scratch()
    runXslint(['--fix-dry-run', file])
    assert.equal(fs.readFileSync(file, 'utf-8'), dirty)
  })
  it('should drop the fixed defect from the report', function() {
    const file = scratch()
    assert.ok(!xslintStreams(['--fix', file]).stdout.includes('redundant-whitespace'))
  })
  it('should collapse a run whose span it can verify', function() {
    assert.equal(
      fixed(
        [{file: 'a.xsl', content: 'X  Y'}],
        [{file: 'a.xsl', fix: {line: 1, col: 2, value: '  ', replacement: ' '}}],
      ).contents.get('a.xsl'),
      'X Y',
    )
  })
  it('cannot fix a run whose span no longer matches', function() {
    assert.ok(
      !fixed(
        [{file: 'a.xsl', content: 'X  Y'}],
        [{
          file: 'a.xsl',
          name: 'redundant-whitespace',
          fix: {line: 1, col: 2, value: 'ZZ', replacement: ' '},
        }],
      ).contents.has('a.xsl'),
    )
  })
  it('cannot fix a defect that belongs to another file', function() {
    assert.deepEqual(
      fixed(
        [{file: 'a.xsl', content: 'X  Y'}],
        [{file: 'b.xsl', fix: {line: 1, col: 2, value: '  ', replacement: ' '}}],
      ).applied,
      [],
    )
  })
})
