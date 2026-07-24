/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

'use strict'

const fs = require('fs')

const version = process.argv[2]
const date = process.argv[3]
if (!version || !date) {
  throw new Error('usage: changelog-release.js <version> <date>')
}

const file = 'CHANGELOG.md'
const lines = fs.readFileSync(file, 'utf-8').split('\n')
const start = lines.findIndex((line) => line.trim() === '## Unreleased')
if (start < 0) {
  throw new Error('no "## Unreleased" section in CHANGELOG.md')
}
const next = lines.findIndex(
  (line, index) => index > start && line.startsWith('## '),
)
const stop = next < 0 ? lines.length : next
const notes = lines.slice(start + 1, stop).join('\n').trim()
if (notes === '') {
  throw new Error('the "## Unreleased" section is empty, nothing to release')
}

fs.writeFileSync(file, [
  ...lines.slice(0, start + 1),
  '',
  `## ${version} - ${date}`,
  ...lines.slice(start + 1),
].join('\n'))

process.stdout.write(`${notes}\n`)
