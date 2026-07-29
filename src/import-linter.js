/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {yaml} = require('./helpers')
const {graphOf} = require('./import-graph')
const path = require('path')
const {logger} = require('./logger')

/**
 * Name of the check this linter owns.
 * @type {string}
 */
const CHECK = 'circular-import'

/**
 * Defect metadata of the check.
 * @type {{severity: string, message: string}}
 */
const META = yaml.parsedFromFile(
  path.join(__dirname, 'resources', 'checks', 'format', `${CHECK}.yaml`),
)

/**
 * Names of the checks this linter owns.
 * @type {Array.<string>}
 */
const names = [CHECK]

/**
 * Whether the goal file is reachable from the start file by following import
 * edges — so an edge sits on a cycle exactly when its target can reach back to
 * its source.
 * @param {Map.<string, Array.<{to: string}>>} adjacency - Edges by source file
 * @param {string} start - File to walk from
 * @param {string} goal - File to look for
 * @return {boolean} - True when goal is reachable from start
 */
const reaches = function(adjacency, start, goal) {
  const stack = [start]
  const seen = new Set()
  while (stack.length > 0) {
    const current = stack.pop()
    if (current === goal) {
      return true
    }
    if (!seen.has(current)) {
      seen.add(current)
      for (const edge of adjacency.get(current) || []) {
        stack.push(edge.to)
      }
    }
  }
  return false
}

/**
 * Lint the corpus for `xsl:import`/`xsl:include` cycles — a stylesheet that
 * imports, directly or through a chain, a stylesheet that imports it back, or
 * one that imports itself. Each import/include edge whose target can reach its
 * own source is reported at the declaring element. A cycle needs every edge in
 * it to resolve within the corpus, so an external href is never part of one
 * and a partial corpus cannot raise a false cycle.
 * @param {Array.<{file: string, xsl: Document}>} corpus - Parsed stylesheets
 * @param {Array.<string>} suppressions - Array of suppressed checks
 * @return {{name: string, severity: string, message: string, file: string,
 *  line: number, pos: number}[]} - Defects found
 */
const lintByImports = function(corpus, suppressions = []) {
  logger.debug(`Import linting started`)
  const defects = []
  if (!suppressions.some((sup) => CHECK.includes(sup))) {
    const edges = graphOf(corpus)
    const adjacency = new Map()
    for (const edge of edges) {
      if (!adjacency.has(edge.from)) {
        adjacency.set(edge.from, [])
      }
      adjacency.get(edge.from).push(edge)
    }
    for (const edge of edges) {
      if (reaches(adjacency, edge.to, edge.from)) {
        defects.push({
          name: CHECK,
          severity: META.severity,
          message: META.message,
          file: edge.from,
          line: edge.node.lineNumber,
          pos: edge.node.columnNumber,
        })
      }
    }
  }
  logger.debug(`Found ${defects.length} circular imports`)
  return defects
}

module.exports = {
  lintByImports,
  names,
}
