/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {xml, yaml} = require('../src/helpers')
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const os = require('os')

describe('helpers', function() {
  it('refuses to parse a file that does not exist', function() {
    assert.throws(() => xml.parsedFromFile(path.join(os.tmpdir(), 'no.xml')))
  })
  it('refuses to parse a directory', function() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xslint-help-'))
    let threw = false
    try {
      xml.parsedFromFile(dir)
    } catch {
      threw = true
    }
    fs.rmSync(dir, {recursive: true, force: true})
    assert.ok(threw)
  })
  it('reports YAML that does not parse', function() {
    assert.throws(() => yaml.parsedFromString('"unterminated'))
  })
  it('keeps a document the parser only warns about', function() {
    assert.ok(xml.parsedFromString('<a b=c></a>').documentElement)
  })
})
