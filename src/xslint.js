/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const path = require('path')
const fs = require('fs')
const {allFilesFrom} = require('./helpers')
const {validate: validateXsls, names: xslChecks} = require('./xsl-validator')
const {
  validate: validateXpaths, names: xpathValidatorChecks,
} = require('./xpath-validator')
const {lintByXpath, names: xpathChecks} = require('./xpath-linter')
const {lintByCorpus, names: corpusChecks} = require('./corpus-linter')
const {lintByAxis, names: axisChecks} = require('./xpath-axis-linter')
const {lintByNamespace, names: namespaceChecks} = require('./namespace-linter')
const {lintByNodeSet, names: nodeSetChecks} = require('./node-set-linter')
const {lintByFormat, names: formatChecks} = require('./xpath-format-linter')
const {fixed} = require('./fixer')
const {logger, levels} = require('./logger')
const {reporterOf} = require('./reporters')
const {configFrom} = require('./config')
const {directivesFrom, suppresses, unused} = require('./directives')
const {minimatch} = require('minimatch')

/**
 * Linters, each given the corpus of well-formed stylesheets.
 * @type {Array.<function(Array.<{file: string, xsl: Document}>,
 *  Array.<string>): Array.<object>>}
 */
const LINTERS = [
  lintByXpath,
  lintByCorpus,
  lintByAxis,
  lintByNamespace,
  lintByNodeSet,
]

/**
 * Expression linters, each given the valid Xpath expressions the validator kept
 * so they never reason over malformed input.
 * @type {Array.<function(Array.<{file: string, expression: Node}>,
 *  Array.<string>): Array.<object>>}
 */
const EXPRESSION_LINTERS = [
  lintByFormat,
]

/**
 * Names of every check across all validators and linters, that suppressions
 * match against.
 * @type {Array.<string>}
 */
const CHECKS = [
  ...xslChecks, ...xpathValidatorChecks,
  ...xpathChecks, ...corpusChecks, ...axisChecks, ...namespaceChecks,
  ...nodeSetChecks, ...formatChecks,
]

/**
 * Deleting incorrect substring-suppressions from array of arguments
 * @param {Array.<string>} suppressions - Array of suppressed checks
 * @return {Array.<string>} - Normalizing list of suppressions
 */
const validatedSuppressions = function(suppressions) {
  for (const sup of suppressions) {
    if (!CHECKS.some((check) => check.includes(sup))) {
      logger.warn(
        `Check with substring '${sup}' does not exist. ` +
        `Delete this '--suppress' or use another one.`,
      )
    }
  }
  if (suppressions.some((sup) => sup === '')) {
    logger.warn(
      'Empty suppress is incorrect. ' +
      'Delete this "--suppress" or use another one.',
    )
    suppressions = suppressions.filter((sup) => (sup) !== '')
  }
  return suppressions
}

/**
 * Returns all .xsl files paths depending on provided path.
 * @param {string} pth - Path to a file or directory holding .xsl files
 * @return {Array.<string>} - Array of .xsl files paths
 */
const xsls = function(pth) {
  let files
  if (fs.statSync(pth).isDirectory()) {
    files = allFilesFrom(pth)
  } else {
    files = [pth]
  }
  return files.filter((file) => file.endsWith('.xsl'))
}

/**
 * Whether a file matches any exclusion glob, compared as a path relative to the
 * configuration's base directory in posix form so the patterns stay portable.
 * @param {string} file - Absolute path of a stylesheet
 * @param {Array.<string>} patterns - Exclusion globs from the configuration
 * @param {string} base - Directory the globs resolve against
 * @return {boolean} - True when the file is excluded
 */
const excluded = function(file, patterns, base) {
  const relative = path.relative(base, file).split(path.sep).join('/')
  return patterns.some((pattern) => minimatch(relative, pattern))
}

/**
 * The log level a quiet flag and an explicit level resolve to: quiet forces
 * warnings-only, otherwise the explicit level, otherwise info.
 * @param {boolean|null|undefined} quiet - Whether to drop informational logs
 * @param {string|null|undefined} level - Explicit level, if any
 * @return {string} - The level to set
 */
const leveled = function(quiet, level) {
  return quiet ? levels.WARNING : level ?? levels.INFO
}

/**
 * Entry point.
 * @param {Array.<string>} pths - Files or directories with .xsl to lint
 * @param {{
 *  logLevel: string,
 *  quiet: boolean,
 *  suppress: Array.<string>,
 *  maxWarnings: number|undefined,
 *  config: string|undefined,
 *  format: string,
 *  fix: boolean|undefined,
 *  fixDryRun: boolean|undefined
 * }} options - CLI options
 */
const xslint = function(pths, options) {
  logger.setLevel(leveled(options.quiet, options.logLevel))
  const config = configFrom(options.config)
  if (options.quiet == null && options.logLevel == null) {
    logger.setLevel(leveled(config.quiet, config.logLevel))
  }
  const disabled = []
  const overrides = {}
  for (const [pattern, severity] of Object.entries(config.rules)) {
    const matched = CHECKS.filter((check) => minimatch(check, pattern))
    if (matched.length === 0) {
      logger.warn(`Rule '${pattern}' in configuration does not exist`)
    }
    for (const check of matched) {
      if (severity === 'off') {
        disabled.push(check)
      } else {
        overrides[check] = severity
      }
    }
  }
  const suppressions = [...validatedSuppressions(options.suppress), ...disabled]
  const maxWarnings = options.maxWarnings ?? config.maxWarnings ?? -1
  logger.info(`Directories and files to process: ${pths.join(', ')}`)
  pths = pths.map((pth) => path.resolve(process.cwd(), pth))
  let stylesheets = []
  for (const pth of pths) {
    if (!fs.existsSync(pth)) {
      logger.warn(`File or directory ${pth} does not exist`)
    } else {
      stylesheets = [...stylesheets, ...xsls(pth)]
    }
  }
  stylesheets = stylesheets.filter(
    (file) => !excluded(file, config.exclude, config.base),
  )
  logger.debug(`Found ${stylesheets.length} .xsl files to process`)
  const sources = stylesheets.map((stylesheet) => ({
    file: stylesheet,
    content: fs.readFileSync(stylesheet, 'utf-8'),
  }))
  const {corpus, defects} = validateXsls(sources, suppressions)
  const {expressions, defects: invalid} = validateXpaths(corpus, suppressions)
  defects.push(...invalid)
  for (const lint of LINTERS) {
    defects.push(...lint(corpus, suppressions))
  }
  for (const lint of EXPRESSION_LINTERS) {
    defects.push(...lint(expressions, suppressions))
  }
  for (const defect of defects) {
    if (overrides[defect.name]) {
      defect.severity = overrides[defect.name]
    }
  }
  const directives = new Map(
    sources.map((source) => [source.file, directivesFrom(source.content)]),
  )
  for (const [file, list] of directives) {
    for (const directive of list) {
      for (const name of directive.names) {
        if (!CHECKS.includes(name)) {
          logger.warn(
            `Rule '${name}' in an xslint-disable directive does not exist`,
          )
        }
      }
    }
    const found = defects.filter((defect) => defect.file === file)
    for (const stale of unused(list, found)) {
      logger.warn(`Unused xslint-disable directive at ${file}:${stale.line}`)
    }
  }
  let reported = defects.filter(
    (defect) => !suppresses(directives.get(defect.file), defect),
  )
  if (options.fix || options.fixDryRun) {
    const {contents, applied} = fixed(sources, reported)
    for (const [file, content] of contents) {
      if (!options.fixDryRun) {
        fs.writeFileSync(file, content)
      }
    }
    if (applied.length > 0) {
      logger.info(`Fixed ${applied.length} defects in ${contents.size} files`)
    }
    reported = reported.filter((defect) => !applied.includes(defect))
  }
  logger.info(`Processed files: ${stylesheets.length}`)
  if (reported.length > 0) {
    logger.info(`Defects found: ${reported.length}`)
  } else {
    logger.info(`No defects found`)
  }
  reporterOf(options.format)(reported)
  const errors = reported.filter((defect) => defect.severity === 'error')
  const warnings = reported.filter((defect) => defect.severity === 'warning')
  if (
    errors.length > 0 ||
    (maxWarnings >= 0 && warnings.length > maxWarnings)
  ) {
    process.exit(1)
  }
}

module.exports = xslint
