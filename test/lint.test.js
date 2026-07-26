/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {lint, fixed} = require('../src/xslint')
const fs = require('fs')
const path = require('path')
const assert = require('assert')

/**
 * Content of a committed stylesheet, read as an in-memory source.
 * @param {string} name - Fixture path under test/resources
 * @return {{file: string, content: string}} - A source for the linter
 */
const source = function(name) {
  return {
    file: name,
    content: fs.readFileSync(path.resolve(__dirname, 'resources', name), 'utf-8'),
  }
}

describe('lint (programmatic API)', function() {
  it('returns defects for in-memory sources', function() {
    const defects = lint([source('stylesheets/xsl-with-some-violations.xsl')])
    assert.ok(defects.some((defect) => defect.name === 'short-names'))
  })
  it('finds nothing wrong with a clean stylesheet', function() {
    assert.deepEqual(
      lint([source('stylesheets/xsl-with-no-violations.xsl')]),
      [],
    )
  })
  it('honors a suppression', function() {
    assert.ok(
      !lint(
        [source('stylesheets/xsl-with-some-violations.xsl')],
        {suppress: ['short-names']},
      ).some((defect) => defect.name === 'short-names'),
    )
  })
  it('re-grades a severity through overrides', function() {
    assert.equal(
      lint(
        [source('stylesheets/xsl-with-some-violations.xsl')],
        {overrides: {'short-names': 'error'}},
      ).find((defect) => defect.name === 'short-names').severity,
      'error',
    )
  })
  it('exposes the fix engine for callers to apply', function() {
    const sources = [source('stylesheets/xsl-with-no-violations.xsl')]
    assert.equal(fixed(sources, lint(sources)).contents.size, 0)
  })
})
