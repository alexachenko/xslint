/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {validate} = require('../src/xsl-validator')
const assert = require('assert')

describe('xsl-validator', function() {
  it('should keep a well-formed stylesheet in the corpus', function() {
    const {corpus} = validate([
      {file: 'good.xsl', content: '<a><b/></a>'},
    ])
    assert.equal(corpus[0].file, 'good.xsl')
  })
  it('should report a malformed stylesheet as a defect', function() {
    const {defects} = validate([
      {file: 'broken.xsl', content: '<a><b></a>'},
    ])
    assert.equal(defects[0].name, 'malformed-stylesheet')
  })
  it('should report an undefined entity as a defect', function() {
    const {defects} = validate([
      {file: 'entity.xsl', content: '<a>&nope; text</a>'},
    ])
    assert.equal(defects[0].name, 'malformed-stylesheet')
  })
  it('should keep a stylesheet that declares an internal entity', function() {
    const {corpus} = validate([
      {file: 'declared.xsl', content: '<!DOCTYPE a [<!ENTITY sc "x">]>\n<a>&sc;</a>'},
    ])
    assert.equal(corpus[0].file, 'declared.xsl')
  })
  it('should report a reference to an entity the subset leaves undeclared',
    function() {
      const {defects} = validate([
        {file: 'gap.xsl', content: '<!DOCTYPE a [<!ENTITY sc "x">]>\n<a>&other;</a>'},
      ])
      assert.equal(defects[0].name, 'malformed-stylesheet')
    })
  it('should keep a stylesheet whose entities come from an external subset',
    function() {
      const {corpus} = validate([
        {file: 'external.xsl', content: '<!DOCTYPE a [<!ENTITY % ent SYSTEM "e.ent"> %ent;]>\n<a>&primary;</a>'},
      ])
      assert.equal(corpus[0].file, 'external.xsl')
    })
  it('should expand an internal entity into the parsed value', function() {
    const {corpus} = validate([
      {file: 'expand.xsl', content: '<!DOCTYPE a [<!ENTITY lc "\'abc\'">]>\n<a t="translate(.,&lc;,X)"/>'},
    ])
    assert.equal(
      corpus[0].xsl.documentElement.getAttribute('t'), 'translate(.,\'abc\',X)',
    )
  })
  it('should not leak parser diagnostics to the console', function() {
    const original = console.error
    const lines = []
    console.error = (...args) => lines.push(args.join(' '))
    try {
      validate([{file: 'broken.xsl', content: '<a><b></a>'}])
    } finally {
      console.error = original
    }
    assert.equal(lines.length, 0)
  })
  it('should leave a malformed stylesheet out of the corpus', function() {
    const {corpus} = validate([
      {file: 'broken.xsl', content: '<a><b></a>'},
    ])
    assert.equal(corpus.length, 0)
  })
  it('should keep only the parseable stylesheets when sources are mixed',
    function() {
      const {corpus} = validate([
        {file: 'good.xsl', content: '<a><b/></a>'},
        {file: 'broken.xsl', content: '<a><b></a>'},
      ])
      assert.equal(corpus[0].file, 'good.xsl')
    })
  it('should report one defect per malformed stylesheet when mixed',
    function() {
      const {defects} = validate([
        {file: 'good.xsl', content: '<a><b/></a>'},
        {file: 'broken.xsl', content: '<a><b></a>'},
      ])
      assert.equal(defects.length, 1)
    })
  it('should not report a malformed stylesheet when its check is suppressed',
    function() {
      const {defects} = validate(
        [{file: 'broken.xsl', content: '<a><b></a>'}],
        ['malformed-stylesheet'],
      )
      assert.equal(defects.length, 0)
    })
})
