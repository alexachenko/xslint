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
 * The lexical space of `xs:decimal`, which is the type `version` is declared
 * with. It is narrower than what `Number` will swallow — `0x2` and `2e0` are
 * numbers to JavaScript and versions to nobody — so the spelling is tested
 * before the value is.
 * @type {RegExp}
 */
const DECIMAL = /^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$/

/**
 * The one XSLT element whose `version` is a serialization parameter rather than
 * a declaration of the language: on `xsl:output` it names the version of the
 * output method, so `4.0` asks for HTML 4.0. Nowhere else does the collision
 * arise. `xsl:result-document` spells its serialization parameter
 * `output-version`, renamed for exactly this reason, so its `version` is the
 * standard attribute and governs the language of everything it contains.
 * @type {string}
 */
const SERIALIZING = 'output'

/**
 * The version a declared value names. `version` is an `xs:decimal`, so `2`,
 * `2.0` and `2.00` are one number written three ways, and a processor drops
 * the surrounding whitespace before reading it; all of them are answered with
 * the canonical spelling. A value naming no version this tool knows — a typo
 * like `2,0`, a spelling the type does not have like `2e0`, or a version
 * released after it — is handed back untouched, so a gate refuses it and a
 * check can report it rather than guess.
 * @param {string} value - The attribute's value
 * @return {string} - The canonical spelling, or the value as it stands
 */
const canonical = function(value) {
  const declared = value.trim()
  const known = DECIMAL.test(declared) &&
    KNOWN.find((one) => Number(one) === Number(declared))
  return known || declared
}

/**
 * The XSLT version the given element declares, or empty when it declares none.
 * An XSLT element spells it `version` and anything else — a literal result
 * element standing in as the stylesheet, or one raising a subtree — spells it
 * `xsl:version`, so the two are told apart by namespace rather than by which
 * attribute is present, and a result vocabulary carrying its own `version`
 * never misleads it. The `version` of a serializing element is passed over for
 * the same reason: it belongs to the output, not to the language.
 * @param {Node} element - The element to read
 * @return {string} - The declared version, or empty
 */
const declaring = function(element) {
  if (element.namespaceURI !== XSLT) {
    return element.getAttributeNS(XSLT, 'version')
  }
  return element.localName === SERIALIZING ?
    '' : element.getAttribute('version')
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
 * nearest ancestor to declare one and the root only when none does. Handed a
 * whole document, it answers for the root.
 * @param {Node} node - Any node of a stylesheet, or the document itself
 * @return {string} - The version in force, or empty when none is declared
 */
const versionOf = function(node) {
  let element = holding(node)
  while (element !== null && element.nodeType === 1) {
    const declared = declaring(element)
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
  DECIMAL,
  versionOf,
}
