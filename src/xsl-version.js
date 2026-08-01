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
 * The versions this tool knows, in the spelling every gate compares against.
 * @type {Array.<string>}
 */
const KNOWN = ['1.0', '2.0', '3.0']

/**
 * The version a declared value names. `version` is an `xs:decimal`, so `2`,
 * `2.0` and `2.00` are one number written three ways, and a processor drops
 * the surrounding whitespace before reading it; all of them are answered with
 * the canonical spelling. A value naming no version this tool knows — a typo
 * like `2,0`, or a version released after it — is handed back untouched, so a
 * gate refuses it and a check can report it rather than guess.
 * @param {string} value - The attribute's value
 * @return {string} - The canonical spelling, or the value as it stands
 */
const canonical = function(value) {
  const declared = value.trim()
  const known = KNOWN.find((one) => Number(one) === Number(declared))
  return known === undefined || declared === '' ? declared : known
}

/**
 * The element a version is read from for the given node: an attribute hangs
 * off the element carrying it, a text node off its parent, and a document off
 * its root.
 * @param {Node} node - Any node of a stylesheet
 * @return {?Node} - Where to begin looking, or null
 */
const holding = function(node) {
  if (node.nodeType === 9) {
    return node.documentElement
  }
  if (node.nodeType === 2) {
    return node.ownerElement
  }
  return node.nodeType === 1 ? node : node.parentNode
}

/**
 * The version in force at the given node. XSLT 2.0 lets `version` sit on any
 * XSLT element and `xsl:version` on any literal result element, each setting
 * the version of that element and everything under it, so the answer is the
 * nearest ancestor to declare one and the root only when none does. The two
 * spellings are told apart by the element's namespace, not by which attribute
 * happens to be present, so a result vocabulary carrying its own `version` —
 * an SVG root does — never misleads it. Handed a whole document, it answers
 * for the root.
 * @param {Node} node - Any node of a stylesheet, or the document itself
 * @return {string} - The version in force, or empty when none is declared
 */
const versionOf = function(node) {
  let element = holding(node)
  while (element !== null && element.nodeType === 1) {
    const declared = element.namespaceURI === XSLT ?
      element.getAttribute('version') :
      element.getAttributeNS(XSLT, 'version')
    if (declared) {
      return canonical(declared)
    }
    element = element.parentNode
  }
  return ''
}

module.exports = {
  XSLT,
  MODERN,
  KNOWN,
  versionOf,
}
