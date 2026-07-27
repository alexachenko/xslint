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
 * Whether the attribute sits inside the declaration's own subtree, so a
 * function that only calls itself does not count as used.
 * @param {Node} declaration - Declaring node
 * @param {Node} attribute - Usage attribute
 * @return {boolean} - True when the attribute is within the declaration
 */
const within = function(declaration, attribute) {
  let node = attribute.ownerElement
  while (node) {
    if (node === declaration) {
      return true
    }
    node = node.parentNode
  }
  return false
}

/**
 * Defects of a check that matches a declaration's name against the usage
 * values by exact identity: the name a `usage` selector yields is the name of
 * a declaration that is used. A named template defined in one file but invoked
 * from another is thus not flagged.
 * @param {Array.<{file: string, xsl: Document}>} corpus - Parsed stylesheets
 * @param {object} check - The check to apply
 * @return {Array.<object>} - Defects found
 */
const byName = function(corpus, check) {
  const used = new Set(corpus.flatMap(({xsl}) => strings(xsl, check.usage)))
  return corpus.flatMap(({file, xsl}) => nodes(xsl, check.declaration)
    .filter((node) => !used.has(node.getAttribute('name')))
    .map((node) => defect(check, file, node)))
}

/**
 * Whether the usage is in scope for the declaration. A `scoped` declaration —
 * a variable — is visible only within its parent's subtree, except a top-level
 * one, which an importing stylesheet in another file can also see. An unscoped
 * declaration — a function — is global, so every usage is in scope.
 * @param {object} check - The check to apply
 * @param {Node} declaration - Declaring node
 * @param {Node} usage - Usage attribute
 * @return {boolean} - True when the usage can see the declaration
 */
const inScope = function(check, declaration, usage) {
  return !check.scoped ||
    within(declaration.parentNode, usage) ||
    (declaration.parentNode === declaration.ownerDocument.documentElement &&
      usage.ownerElement.ownerDocument !== declaration.ownerDocument)
}

/**
 * Whether the declaration is referenced by an in-scope usage, matching its
 * name as a substring (`name(` for a function, `$name` for a variable). Its
 * own subtree is excluded, so recursion alone is not use.
 * @param {object} check - The check to apply, carrying a `reference` template
 * @param {Node} declaration - Declaring node
 * @param {Array.<Node>} usages - Usage attributes across the corpus
 * @return {boolean} - True when referenced
 */
const used = function(check, declaration, usages) {
  const needle = check.reference.replaceAll(
    '{name}', declaration.getAttribute('name'),
  )
  return usages.some((usage) =>
    !within(declaration, usage) &&
    usage.value.includes(needle) &&
    inScope(check, declaration, usage))
}

/**
 * Defects of a check that searches for a declaration's name as a substring of
 * the usage values — a stylesheet function or a variable is referenced from
 * within an XPath expression (`name(`, `$name`), not by an attribute of its
 * own, and the reference can live in any file that imports the declaring one.
 * @param {Array.<{file: string, xsl: Document}>} corpus - Parsed stylesheets
 * @param {object} check - The check to apply, carrying a `reference` template
 * @return {Array.<object>} - Defects found
 */
const byReference = function(corpus, check) {
  const usages = corpus.flatMap(({xsl}) => nodes(xsl, check.usage))
  return corpus.flatMap(({file, xsl}) => nodes(xsl, check.declaration)
    .filter((node) => !used(check, node, usages))
    .map((node) => defect(check, file, node)))
}

/**
 * A defect for the declaring node.
 * @param {object} check - The check that fired
 * @param {string} file - File the node belongs to
 * @param {Node} node - Declaring node
 * @return {object} - Defect
 */
const defect = function(check, file, node) {
  return {
    name: check.name,
    severity: check.severity,
    message: check.message,
    file: file,
    line: node.lineNumber,
    pos: node.columnNumber,
  }
}

/**
 * Lint the whole corpus of stylesheets by cross-file checks. A declaration is
 * a defect only when it is used by no stylesheet in the corpus — matched by
 * name for a named template, or by reference within an expression for a
 * function or variable — so one defined in one file but used from another is
 * not flagged.
 * @param {Array.<{file: string, xsl: Document}>} corpus - Parsed stylesheets
 * @param {Array.<string>} suppressions - Array of suppressed checks
 * @return {{name: string, severity: string, message: string, file: string,
 *  line: number, pos: number}[]} - Defects found
 */
const lintByCorpus = function(corpus, suppressions = []) {
  logger.debug(`Corpus linting started`)
  const defects = CHECKS
    .filter((check) => !suppressions.some((sup) => check.name.includes(sup)))
    .flatMap((check) => check.reference ?
      byReference(corpus, check) :
      byName(corpus, check))
  logger.debug(`Found ${defects.length} corpus defects`)
  return defects
}

module.exports = {
  lintByCorpus,
  names,
}
