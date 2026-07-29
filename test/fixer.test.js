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
  it('should drop the redundant leading slashes of a match with --fix',
    function() {
      const file = scratch(fixture('starts-with-double-slash.xsl'))
      runXslint(['--fix', file])
      assert.equal(
        fs.readFileSync(file, 'utf-8'),
        fixture('starts-with-double-slash.fixed.xsl'),
      )
    })
  it('cannot drop the leading slashes with --fix-dry-run', function() {
    const file = scratch(fixture('starts-with-double-slash.xsl'))
    runXslint(['--fix-dry-run', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('starts-with-double-slash.xsl'),
    )
  })
  it('should drop the fixed starts-with-double-slash defect from the report',
    function() {
      const file = scratch(fixture('starts-with-double-slash.xsl'))
      assert.ok(
        !xslintStreams(['--fix', file])
          .stdout.includes('starts-with-double-slash'),
      )
    })
  it('should delete a redundant import with --fix', function() {
    const file = scratch(fixture('redundant-import.xsl'))
    runXslint(['--fix', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('redundant-import.fixed.xsl'),
    )
  })
  it('cannot delete a redundant import with --fix-dry-run', function() {
    const file = scratch(fixture('redundant-import.xsl'))
    runXslint(['--fix-dry-run', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('redundant-import.xsl'),
    )
  })
  it('should drop the fixed redundant-import defect from the report',
    function() {
      const file = scratch(fixture('redundant-import.xsl'))
      assert.ok(
        !xslintStreams(['--fix', file]).stdout.includes('redundant-import'),
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
  it('should rewrite a count comparison to exists/empty with --fix', function() {
    const file = scratch(fixture('count-compared-to-zero.xsl'))
    runXslint(['--fix', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('count-compared-to-zero.fixed.xsl'),
    )
  })
  it('cannot rewrite a count comparison with --fix-dry-run', function() {
    const file = scratch(fixture('count-compared-to-zero.xsl'))
    runXslint(['--fix-dry-run', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('count-compared-to-zero.xsl'),
    )
  })
  it('should drop the fixed count defect from the report', function() {
    const file = scratch(fixture('count-compared-to-zero.xsl'))
    assert.ok(
      !xslintStreams(['--fix', file]).stdout.includes('count-compared-to-zero'),
    )
  })
  it('should rewrite a string-length comparison to != / = with --fix',
    function() {
      const file = scratch(fixture('string-length-compared-to-zero.xsl'))
      runXslint(['--fix', file])
      assert.equal(
        fs.readFileSync(file, 'utf-8'),
        fixture('string-length-compared-to-zero.fixed.xsl'),
      )
    })
  it('cannot rewrite a string-length comparison with --fix-dry-run', function() {
    const file = scratch(fixture('string-length-compared-to-zero.xsl'))
    runXslint(['--fix-dry-run', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('string-length-compared-to-zero.xsl'),
    )
  })
  it('should drop the fixed string-length defect from the report', function() {
    const file = scratch(fixture('string-length-compared-to-zero.xsl'))
    assert.ok(
      !xslintStreams(['--fix', file])
        .stdout.includes('string-length-compared-to-zero'),
    )
  })
  it('cannot rewrite a name comparison with plain --fix', function() {
    const file = scratch(fixture('name-compared-to-string.xsl'))
    runXslint(['--fix', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('name-compared-to-string.xsl'),
    )
  })
  it('should rewrite a name comparison to a node test with --fix-suggestions',
    function() {
      const file = scratch(fixture('name-compared-to-string.xsl'))
      runXslint(['--fix-suggestions', file])
      assert.equal(
        fs.readFileSync(file, 'utf-8'),
        fixture('name-compared-to-string.fixed.xsl'),
      )
    })
  it('should drop the fixed name defect with --fix-suggestions', function() {
    const file = scratch(fixture('name-compared-to-string.xsl'))
    assert.ok(
      !xslintStreams(['--fix-suggestions', file])
        .stdout.includes('name-compared-to-string'),
    )
  })
  it('cannot rewrite a translate case fold with plain --fix', function() {
    const file = scratch(fixture('translate-for-case.xsl'))
    runXslint(['--fix', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('translate-for-case.xsl'),
    )
  })
  it('should rewrite a translate case fold to lower/upper-case with ' +
    '--fix-suggestions', function() {
    const file = scratch(fixture('translate-for-case.xsl'))
    runXslint(['--fix-suggestions', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('translate-for-case.fixed.xsl'),
    )
  })
  it('should drop the fixed translate defect with --fix-suggestions', function() {
    const file = scratch(fixture('translate-for-case.xsl'))
    assert.ok(
      !xslintStreams(['--fix-suggestions', file])
        .stdout.includes('translate-for-case'),
    )
  })
  it('cannot exclude a leaking prefix with plain --fix', function() {
    const file = scratch(fixture('leaking-result-namespace.xsl'))
    runXslint(['--fix', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('leaking-result-namespace.xsl'),
    )
  })
  it('should exclude a leaking prefix with --fix-suggestions', function() {
    const file = scratch(fixture('leaking-result-namespace.xsl'))
    runXslint(['--fix-suggestions', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('leaking-result-namespace.fixed.xsl'),
    )
  })
  it('should drop the fixed leaking-result-namespace defect with ' +
    '--fix-suggestions', function() {
    const file = scratch(fixture('leaking-result-namespace.xsl'))
    assert.ok(
      !xslintStreams(['--fix-suggestions', file])
        .stdout.includes('leaking-result-namespace'),
    )
  })
  it('should append to an existing exclude-result-prefixes with ' +
    '--fix-suggestions', function() {
    const file = scratch(fixture('leaking-result-namespace-appended.xsl'))
    runXslint(['--fix-suggestions', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('leaking-result-namespace-appended.fixed.xsl'),
    )
  })
  it('cannot rewrite a boolean-constant test with plain --fix', function() {
    const file = scratch(fixture('incorrect-use-of-boolean-constants.xsl'))
    runXslint(['--fix', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('incorrect-use-of-boolean-constants.xsl'),
    )
  })
  it('should rewrite a boolean-constant test to true()/false() with ' +
    '--fix-suggestions', function() {
    const file = scratch(fixture('incorrect-use-of-boolean-constants.xsl'))
    runXslint(['--fix-suggestions', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('incorrect-use-of-boolean-constants.fixed.xsl'),
    )
  })
  it('should drop the fixed boolean-constant defect with --fix-suggestions',
    function() {
      const file = scratch(fixture('incorrect-use-of-boolean-constants.xsl'))
      assert.ok(
        !xslintStreams(['--fix-suggestions', file])
          .stdout.includes('incorrect-use-of-boolean-constants'),
      )
    })
  it('cannot anchor a leading // select with plain --fix', function() {
    const file = scratch(fixture('select-starts-with-double-slash.xsl'))
    runXslint(['--fix', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('select-starts-with-double-slash.xsl'),
    )
  })
  it('should anchor a leading // select as .// with --fix-suggestions',
    function() {
      const file = scratch(fixture('select-starts-with-double-slash.xsl'))
      runXslint(['--fix-suggestions', file])
      assert.equal(
        fs.readFileSync(file, 'utf-8'),
        fixture('select-starts-with-double-slash.fixed.xsl'),
      )
    })
  it('should drop the fixed select-starts-with-double-slash defect with ' +
    '--fix-suggestions', function() {
    const file = scratch(fixture('select-starts-with-double-slash.xsl'))
    assert.ok(
      !xslintStreams(['--fix-suggestions', file])
        .stdout.includes('select-starts-with-double-slash'),
    )
  })
  it('cannot prepend $ to a bare variable name with plain --fix', function() {
    const file = scratch(fixture('confusing-variable-and-node.xsl'))
    runXslint(['--fix', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('confusing-variable-and-node.xsl'),
    )
  })
  it('should prepend $ to a bare variable name with --fix-suggestions',
    function() {
      const file = scratch(fixture('confusing-variable-and-node.xsl'))
      runXslint(['--fix-suggestions', file])
      assert.equal(
        fs.readFileSync(file, 'utf-8'),
        fixture('confusing-variable-and-node.fixed.xsl'),
      )
    })
  it('should drop the fixed confusing-variable-and-node defect with ' +
    '--fix-suggestions', function() {
    const file = scratch(fixture('confusing-variable-and-node.xsl'))
    assert.ok(
      !xslintStreams(['--fix-suggestions', file])
        .stdout.includes('confusing-variable-and-node'),
    )
  })
  it('cannot wrap loose text in xsl:text with plain --fix', function() {
    const file = scratch(fixture('text-outside-xsl-text.xsl'))
    runXslint(['--fix', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('text-outside-xsl-text.xsl'),
    )
  })
  it('should wrap loose text in xsl:text with --fix-suggestions', function() {
    const file = scratch(fixture('text-outside-xsl-text.xsl'))
    runXslint(['--fix-suggestions', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('text-outside-xsl-text.fixed.xsl'),
    )
  })
  it('should drop the fixed text-outside-xsl-text defect with ' +
    '--fix-suggestions', function() {
    const file = scratch(fixture('text-outside-xsl-text.xsl'))
    assert.ok(
      !xslintStreams(['--fix-suggestions', file])
        .stdout.includes('text-outside-xsl-text'),
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
  it('should switch an xml output method to html with --fix-suggestions',
    function() {
      const file = scratch(fixture('output-method-xml.xsl'))
      runXslint(['--fix-suggestions', file])
      assert.equal(
        fs.readFileSync(file, 'utf-8'),
        fixture('output-method-xml.fixed.xsl'),
      )
    })
  it('should declare a missing version with --fix-suggestions', function() {
    const file = scratch(fixture('missing-version-in-stylesheet.xsl'))
    runXslint(['--fix-suggestions', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('missing-version-in-stylesheet.fixed.xsl'),
    )
  })
  it('should drop an orphan mode with --fix-suggestions', function() {
    const file = scratch(fixture('mode-or-priority-without-match.xsl'))
    runXslint(['--fix-suggestions', file])
    assert.equal(
      fs.readFileSync(file, 'utf-8'),
      fixture('mode-or-priority-without-match.fixed.xsl'),
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
