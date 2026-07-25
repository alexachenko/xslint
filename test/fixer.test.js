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
 * Read one of the committed fix fixtures.
 * @param {string} name - Fixture base name
 * @return {string} - The fixture's content
 */
const fixture = function(name) {
  return fs.readFileSync(
    path.resolve(__dirname, 'resources', 'fix', name),
    'utf-8',
  )
}

/**
 * A stylesheet carrying redundant whitespace, and its collapsed form.
 * @type {string}
 */
const dirty = fixture('redundant-whitespace.xsl')
const clean = fixture('redundant-whitespace.fixed.xsl')

/**
 * Copy the given content into a fresh temporary file, so a fixing run never
 * mutates the committed fixture, and return its path.
 * @param {string} content - Stylesheet to seed the file with
 * @return {string} - Path of the temporary stylesheet
 */
const scratch = function(content) {
  const file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'xslint-fix-')),
    'sheet.xsl',
  )
  fs.writeFileSync(file, content)
  return file
}

describe('fixer', function() {
  it('should collapse redundant whitespace in place with --fix', function() {
    const file = scratch(dirty)
    runXslint(['--fix', file])
    assert.equal(fs.readFileSync(file, 'utf-8'), clean)
  })
  it('cannot touch the file with --fix-dry-run', function() {
    const file = scratch(dirty)
    runXslint(['--fix-dry-run', file])
    assert.equal(fs.readFileSync(file, 'utf-8'), dirty)
  })
  it('should drop the fixed defect from the report', function() {
    const file = scratch(dirty)
    assert.ok(!xslintStreams(['--fix', file]).stdout.includes('redundant-whitespace'))
  })
  it('should abbreviate verbose axes in place with --fix', function() {
    const file = scratch(fixture('unabbreviated-axis.xsl'))
    runXslint(['--fix', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('unabbreviated-axis.fixed.xsl'),
    )
  })
  it('cannot abbreviate a parent axis that has no short form', function() {
    const file = scratch(fixture('unabbreviated-axis.xsl'))
    runXslint(['--fix', file])
    assert.ok(fs.readFileSync(file, 'utf-8').includes('parent::n'))
  })
  it('should delete a redundant namespace declaration with --fix', function() {
    const file = scratch(fixture('redundant-namespace-declarations.xsl'))
    runXslint(['--fix', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('redundant-namespace-declarations.fixed.xsl'),
    )
  })
  it('should unwrap the node-set extension with --fix', function() {
    const file = scratch(fixture('use-node-set-extension.xsl'))
    runXslint(['--fix', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('use-node-set-extension.fixed.xsl'),
    )
  })
  it('cannot apply a suggestion with plain --fix', function() {
    const file = scratch(fixture('using-disable-output-escaping.xsl'))
    runXslint(['--fix', file])
    assert.ok(fs.readFileSync(file, 'utf-8').includes('disable-output-escaping'))
  })
  it('should apply a suggestion with --fix-suggestions', function() {
    const file = scratch(fixture('using-disable-output-escaping.xsl'))
    runXslint(['--fix-suggestions', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('using-disable-output-escaping.fixed.xsl'),
    )
  })
  it('should announce how many defects --fix would fix', function() {
    const file = scratch(dirty)
    assert.ok(xslintStreams([file]).stderr.includes('fixable with --fix'))
  })
  it('should announce a suggestion under --fix-suggestions', function() {
    const file = scratch(fixture('using-disable-output-escaping.xsl'))
    assert.ok(xslintStreams([file]).stderr.includes('fixable with --fix-suggestions'))
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
