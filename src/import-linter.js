/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {yaml} = require('./helpers')
const {importsOf, graphOf} = require('./import-graph')
const path = require('path')
const {logger} = require('./logger')

/**
 * Name of the cycle check.
 * @type {string}
 */
const CIRCULAR = 'circular-import'

/**
 * Name of the duplicate-import check.
 * @type {string}
 */
const REDUNDANT = 'redundant-import'

/**
 * Defect metadata of a check, read from its formatting YAML.
 * @param {string} check - Check name
 * @return {{severity: string, message: string}} - The metadata
 */
const meta = function(check) {
  return yaml.parsedFromFile(
    path.join(__dirname, 'resources', 'checks', 'format', `${check}.yaml`),
  )
}

/**
 * Metadata of both checks, keyed by name.
 * @type {{[check: string]: {severity: string, message: string}}}
 */
const META = {[CIRCULAR]: meta(CIRCULAR), [REDUNDANT]: meta(REDUNDANT)}

/**
 * Names of the checks this linter owns.
 * @type {Array.<string>}
 */
const names = [CIRCULAR, REDUNDANT]

/**
 * A defect of one of the import checks.
 * @param {string} check - Check name
 * @param {string} file - File the import sits in
 * @param {Element} node - The `xsl:import`/`xsl:include` element
 * @return {object} - Defect
 */
const defect = function(check, file, node) {
  return {
    name: check,
    severity: META[check].severity,
    message: META[check].message,
    file: file,
    line: node.lineNumber,
    pos: node.columnNumber,
  }
}

/**
 * Whether a check is suppressed — a suppression matches it as a substring.
 * @param {string} check - Check name
 * @param {Array.<string>} suppressions - Suppressed checks
 * @return {boolean} - True when suppressed
 */
const suppressed = function(check, suppressions) {
  return suppressions.some((sup) => check.includes(sup))
}

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
 * Defects for `circular-import` — each import/include edge whose target can
 * reach back to its own source, so the stylesheet is part of a cycle (or
 * imports itself).
 * @param {Array.<{file: string, xsl: Document}>} corpus - Parsed stylesheets
 * @return {Array.<object>} - Defects found
 */
const byCircularity = function(corpus) {
  const edges = graphOf(corpus)
  const adjacency = new Map()
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) {
      adjacency.set(edge.from, [])
    }
    adjacency.get(edge.from).push(edge)
  }
  return edges
    .filter((edge) => reaches(adjacency, edge.to, edge.from))
    .map((edge) => defect(CIRCULAR, edge.from, edge.node))
}

/**
 * A safe fix that deletes a redundant import — its whole line, reconstructed
 * from the element as its indentation, the self-closing tag with its single
 * `href`, and the trailing newline. The fixer applies it only when the source
 * is exactly that, so an oddly formatted, single-quoted, or non-self-closing
 * import is reported but left untouched rather than mis-edited. Deleting a
 * duplicate is semantics-preserving — the module stays imported by the first
 * reference — so it is a safe fix, not a suggestion.
 * @param {Element} node - The duplicate import/include element
 * @return {{line: number, col: number, value: string, replacement: string}} -
 *  The fix
 */
const removal = function(node) {
  return {
    line: node.lineNumber,
    col: 1,
    value: `${' '.repeat(node.columnNumber - 1)}` +
      `<${node.nodeName} href="${node.getAttribute('href')}"/>\n`,
    replacement: '',
  }
}

/**
 * Defects for `redundant-import` — the second and later `xsl:import`/
 * `xsl:include` of the same resolved target within one stylesheet's own list.
 * The target need not be a corpus file: importing the same external library
 * twice is redundant too. Each carries a fix that deletes the duplicate line.
 * @param {Array.<{file: string, xsl: Document}>} corpus - Parsed stylesheets
 * @return {Array.<object>} - Defects found
 */
const byRedundancy = function(corpus) {
  const seen = new Set()
  const defects = []
  for (const {file, node, to} of importsOf(corpus)) {
    const key = `${file}|${to}`
    if (seen.has(key)) {
      defects.push({...defect(REDUNDANT, file, node), fix: removal(node)})
    } else {
      seen.add(key)
    }
  }
  return defects
}

/**
 * Lint the corpus for import-graph defects: `xsl:import`/`xsl:include` cycles
 * (`circular-import`, an error) and the same module imported more than once in
 * one stylesheet (`redundant-import`, a warning). Both resolve hrefs against
 * the importing file's directory (`src/import-graph.js`).
 * @param {Array.<{file: string, xsl: Document}>} corpus - Parsed stylesheets
 * @param {Array.<string>} suppressions - Array of suppressed checks
 * @return {{name: string, severity: string, message: string, file: string,
 *  line: number, pos: number}[]} - Defects found
 */
const lintByImports = function(corpus, suppressions = []) {
  logger.debug(`Import linting started`)
  const defects = [
    ...suppressed(CIRCULAR, suppressions) ? [] : byCircularity(corpus),
    ...suppressed(REDUNDANT, suppressions) ? [] : byRedundancy(corpus),
  ]
  logger.debug(`Found ${defects.length} import defects`)
  return defects
}

module.exports = {
  lintByImports,
  names,
}
