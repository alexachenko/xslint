/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const path = require('path')

/**
 * The XSLT namespace, whose `import`/`include` elements pull in other modules.
 * @type {string}
 */
const XSLT = 'http://www.w3.org/1999/XSL/Transform'

/**
 * The corpus file an href resolves to, relative to the importing file's own
 * directory and normalized.
 * @param {string} file - The importing file's path
 * @param {string} href - The `@href` of an `xsl:import`/`xsl:include`
 * @return {string} - The resolved, normalized target path
 */
const target = function(file, href) {
  return path.normalize(path.join(path.dirname(file), href))
}

/**
 * The import/include dependency edges among the corpus stylesheets. Each
 * `xsl:import`/`xsl:include` whose `@href` resolves to a file in the corpus
 * yields one edge, carrying the declaring element so a defect can point at it;
 * an href that resolves outside the corpus is external and yields no edge, so
 * a stylesheet that imports a library it was not handed alongside is never
 * mistaken for a dependency. No file is read here — the corpus already holds
 * every parsed stylesheet with its path.
 * @param {Array.<{file: string, xsl: Document}>} corpus - Parsed stylesheets
 * @return {Array.<{from: string, to: string, node: Element}>} - The edges
 */
const graphOf = function(corpus) {
  const files = new Set(corpus.map(({file}) => path.normalize(file)))
  return corpus.flatMap(({file, xsl}) =>
    Array.from(xsl.getElementsByTagName('*'))
      .filter(
        (element) =>
          element.namespaceURI === XSLT &&
          (element.localName === 'import' || element.localName === 'include'),
      )
      .map((node) => ({
        from: path.normalize(file),
        to: target(file, node.getAttribute('href')),
        node: node,
      }))
      .filter((edge) => files.has(edge.to)))
}

module.exports = {
  graphOf,
}
