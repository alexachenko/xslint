/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {nodes} = require('./xpath')
const {enclosed} = require('./expressions')
const {XSLT, versionOf} = require('./xsl-version')

/**
 * Attributes that hold an XPath expression or a pattern — every place a
 * construct like an axis, a predicate, or a `count(...)` call can appear.
 * Patterns (`match` and the grouping attributes) are included, so a construct
 * in a template match is caught too, not only in the expression stream.
 * @type {Array.<string>}
 */
const ATTRIBUTES = [
  'select', 'test', 'use', 'value', 'group-by', 'group-adjacent', 'key',
  'initial-value', 'xpath', 'context-item', 'with-params', 'namespace-context',
  'match', 'count', 'from', 'group-starting-with', 'group-ending-with',
]

/**
 * XPath selecting the named attribute of every XSLT element, document-wide. The
 * XSLT namespace belongs in the selector because only there does the name mean
 * an expression: an attribute the output vocabulary happens to call `test` or
 * `select` holds text destined for the result tree, not XPath.
 * @param {string} name - Name of the attribute
 * @return {string} - The Xpath selecting it
 */
const selectorOf = function(name) {
  return `//xsl:*/@${name}`
}

/**
 * XPath selecting every attribute that holds a bare XPath, across the document.
 * @type {string}
 */
const SELECTOR = ATTRIBUTES.map(selectorOf).join(' | ')

/**
 * The spellings that switch an XSLT boolean attribute on, whitespace trimmed —
 * `expand-text="true"` and `="1"` turn text value templates on as surely as
 * `="yes"` does.
 * @type {Array.<string>}
 */
const ON = ['yes', 'true', '1']

/**
 * Whether text value templates expand around the given text node — the nearest
 * ancestor to set `expand-text` (an XSLT element) or `xsl:expand-text` (a
 * literal result element) wins, and expansion is off until one does. In XSLT
 * 3.0 an on setting turns the `{...}` of a text node into real expressions, the
 * way a `select` carries one.
 * @param {Node} text - The text node
 * @return {boolean} - True when its braces expand
 */
const expands = function(text) {
  let node = text.parentNode
  while (node.nodeType === 1) {
    const setting = node.namespaceURI === XSLT ?
      node.getAttribute('expand-text') :
      node.getAttributeNS(XSLT, 'expand-text')
    if (setting) {
      return ON.includes(setting.trim())
    }
    node = node.parentNode
  }
  return false
}

/**
 * Whether the attribute is a shadow attribute standing in for a bare-XPath one
 * — `_select` for `select` — on an XSLT element, with no braces, so its whole
 * value is the static expression that becomes the real attribute (XSLT 3.0).
 * A shadow attribute that does carry braces is a template, left to `enclosed`.
 * @param {Node} attribute - The attribute node
 * @return {boolean} - True when its whole value is an expression
 */
const shadow = function(attribute) {
  return attribute.ownerElement.namespaceURI === XSLT &&
    attribute.nodeName.startsWith('_') &&
    ATTRIBUTES.includes(attribute.nodeName.slice(1)) &&
    !attribute.nodeValue.includes('{')
}

/**
 * The expressions a node contributes: a whole value when it is a bare-XPath (or
 * shadow) attribute, otherwise each expression its braces enclose — an
 * attribute value template, or a text value template in a text node (a CDATA
 * section is one too) of a 3.0 stylesheet whose `expand-text` is on. Only an
 * attribute takes the attribute branch, so any other node the selector yields
 * is read as text rather than dereferenced as one. Each names its node, the
 * offset it starts at inside that node's value, and its own text.
 * @param {Node} node - An attribute, text, or CDATA node
 * @param {Set.<Node>} bare - Attributes holding a bare XPath
 * @param {boolean} three - Whether the stylesheet declares version 3.0
 * @return {Array.<{node: Node, start: number, expression: string}>} - Found
 */
const carried = function(node, bare, three) {
  if (node.nodeType !== 2) {
    return three && expands(node) ? enclosed(node.nodeValue).map((found) => ({
      node: node, start: found.offset, expression: found.value,
    })) : []
  }
  if (bare.has(node) || (three && shadow(node))) {
    return [{node: node, start: 0, expression: node.nodeValue}]
  }
  return enclosed(node.nodeValue).map((found) => ({
    node: node, start: found.offset, expression: found.value,
  }))
}

/**
 * Every expression a stylesheet carries, in document order. An attribute
 * holding a bare XPath contributes its whole value; another attribute, and a
 * text node under an on `expand-text` in a 3.0 stylesheet, contribute each
 * expression their braces enclose. Each one names the node, the offset it
 * starts at inside that node's value, and its own text, so a defect in it is
 * reported — and fixed — where it truly stands.
 * @param {Document} xsl - XSL document parsed as {@link Document}
 * @return {Array.<{node: Node, start: number, expression: string}>} - The
 *  expressions found
 */
const expressionsOf = function(xsl) {
  const bare = new Set(nodes(xsl, SELECTOR))
  const three = versionOf(xsl) === '3.0'
  return nodes(xsl, '//*/@* | //text()').flatMap(
    (node) => carried(node, bare, three),
  )
}

module.exports = {
  ATTRIBUTES,
  selectorOf,
  expressionsOf,
}
