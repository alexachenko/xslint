/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {versionOf} = require('../src/xsl-version')
const {xml, yaml} = require('../src/helpers')
const path = require('path')
const assert = require('assert')

/**
 * Root shapes paired with the version each declares.
 * @type {Array.<{name: string, input: string, version: string}>}
 */
const ROOTS = yaml.parsedFromFile(
  path.resolve(__dirname, 'resources', 'xsl-version', 'roots.yaml'),
)

describe('xsl-version', function() {
  ROOTS.forEach((root) => {
    it(root.name, function() {
      assert.equal(versionOf(xml.parsedFromString(root.input)), root.version)
    })
  })
})
