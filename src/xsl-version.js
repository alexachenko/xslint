/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

/**
 * The XSLT namespace, which distinguishes a stylesheet root from a literal
 * result element standing in as one.
 * @type {string}
 */
const XSLT = 'http://www.w3.org/1999/XSL/Transform'

/**
 * Versions where an XSLT 2.0-or-later construct is available.
 * @type {Array.<string>}
 */
const MODERN = ['2.0', '3.0']

/**
 * The version a stylesheet declares, read from wherever its root shape keeps
 * it: an unprefixed `version` on an `xsl:stylesheet`/`xsl:transform`, or the
 * XSLT-namespaced `version` on the literal result element of a simplified
 * stylesheet. The two are told apart by the root's namespace, not by which
 * attribute happens to be present, so a result vocabulary carrying its own
 * `version` — an SVG root does — never misleads it.
 * @param {Document} xsl - Parsed stylesheet
 * @return {string} - The declared version, or empty when none is declared
 */
const versionOf = function(xsl) {
  const root = xsl.documentElement
  return (root.namespaceURI === XSLT ?
    root.getAttribute('version') : root.getAttributeNS(XSLT, 'version')) || ''
}

module.exports = {
  XSLT,
  MODERN,
  versionOf,
}
