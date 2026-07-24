/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {nodes, strings} = require('./xpath')
const {allFilesFrom, yaml} = require('./helpers')
const path = require('path')
const {logger} = require('./logger')

/**
 * Corpus checks, each parsed once at load: the name suppressions match against,
 * plus the declaration/usage selectors and defect metadata.
 * @type {Array.<{name: string, declaration: string, usage: string,
 *  severity: string, message: string}>}
 */
const CHECKS = allFilesFrom(
  path.join(__dirname, 'resources', 'checks', 'corpus'),
).map((check) => ({
  name: check.substring(
    check.lastIndexOf(path.sep) + 1, check.lastIndexOf('.yaml'),
  ),
  ...yaml.parsedFromFile(check),
}))

/**
 * Names of the checks this linter owns.
 * @type {Array.<string>}
 */
const names = CHECKS.map((check) => check.name)

/**
 * Lint the whole corpus of stylesheets by cross-file checks. A declaration is
 * a defect only when its name is used by no stylesheet in the corpus, so a
 * named template defined in one file but invoked from another is not flagged.
 * @param {Array.<{file: string, xsl: Document}>} corpus - Parsed stylesheets
 * @param {Array.<string>} suppressions - Array of suppressed checks
 * @return {{name: string, severity: string, message: string, file: string,
 *  line: number, pos: number}[]} - Defects found
 */
const lintByCorpus = function(corpus, suppressions = []) {
  logger.debug(`Corpus linting started`)
  const defects = []
  for (const check of CHECKS) {
    if (suppressions.some((sup) => check.name.includes(sup))) {
      continue
    }
    const used = new Set(
      corpus.flatMap(({xsl}) => strings(xsl, check.usage)),
    )
    for (const {file, xsl} of corpus) {
      for (const node of nodes(xsl, check.declaration)) {
        if (!used.has(node.getAttribute('name'))) {
          defects.push({
            name: check.name,
            severity: check.severity,
            message: check.message,
            file: file,
            line: node.lineNumber,
            pos: node.columnNumber,
          })
        }
      }
    }
  }
  logger.debug(`Found ${defects.length} corpus defects`)
  return defects
}

module.exports = {
  lintByCorpus,
  names,
}
