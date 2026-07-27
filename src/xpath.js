/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {
  evaluateXPath, evaluateXPathToNodes, evaluateXPathToStrings,
  compileXPathToJavaScript,
} = require('fontoxpath')

/**
 * Namespace URI of the xslint custom XPath functions.
 * @type {string}
 */
const FUNCTIONS = 'https://github.com/maxonfjvipon/xslint'

/**
 * Standard prefixes bound in every Xpath expression. When validating, an
 * unknown prefix must not be mistaken for a syntax error, so these resolve to
 * their real URIs and any other prefix resolves to a placeholder.
 * @type {object}
 */
const STANDARD = {
  'xsl': 'http://www.w3.org/1999/XSL/Transform',
  'xs': 'http://www.w3.org/2001/XMLSchema',
  'fn': 'http://www.w3.org/2005/xpath-functions',
  'map': 'http://www.w3.org/2005/xpath-functions/map',
  'array': 'http://www.w3.org/2005/xpath-functions/array',
  'math': 'http://www.w3.org/2005/xpath-functions/math',
}

/**
 * Prefixes.
 * @type {{xsl: string, xslint: string}}
 */
const PREFIXES = {
  'xsl': STANDARD.xsl,
  'xslint': FUNCTIONS,
}

/**
 * Resolve prefix.
 * @param {string} prefix - Prefix itself
 * @return {null | string} - Resolved prefix
 */
const resolvePrefix = function(prefix) {
  let spec = null
  if (Object.hasOwn(PREFIXES, prefix)) {
    spec = PREFIXES[prefix]
  }
  return spec
}

/**
 * Nodes matching given Xpath on given XSL.
 * @param {Document} xsl - XSL document parsed as {@link Document}
 * @param {string} xpath - Xpath
 * @return {Array.<Node>} - Matching nodes in the order defined by the XPath
 */
const nodes = function(xsl, xpath) {
  return evaluateXPathToNodes(
    xpath, xsl, null, {}, {namespaceResolver: resolvePrefix},
  )
}

/**
 * String values matching given Xpath on given XSL.
 * @param {Document} xsl - XSL document parsed as {@link Document}
 * @param {string} xpath - Xpath
 * @return {Array.<string>} - Matching string values
 */
const strings = function(xsl, xpath) {
  return evaluateXPathToStrings(
    xpath, xsl, null, {}, {namespaceResolver: resolvePrefix},
  )
}

/**
 * A thrown compile failure that carries a W3C error code, as opposed to a
 * parse failure. The engine reports a syntax error as "<position>: <source>",
 * but a static or type error as a QName-shaped code such as XPTY0004 or
 * XPST0017. Only the former means the expression is genuinely malformed.
 * @type {RegExp}
 */
const CODED = /^[A-Z]{4}\d{4}/

/**
 * The namespace axis, which XPath 3.0 dropped but 1.0 and 2.0 define. The
 * engine cannot parse it, so an expression that uses it is rewritten to a
 * supported axis before being retried.
 * @type {RegExp}
 */
const NAMESPACE_AXIS = /namespace\s*::/

/**
 * Whether the engine compiles the expression, counting a static-type
 * complaint as success. The engine is XPath 3.1, so it rejects the implicit
 * numeric coercion an XPath 1.0 stylesheet leans on (substring-before(...) -
 * 1); that is a dialect mismatch, not a syntax error. It tells the two apart
 * by the shape of the failure: a parse error is "<position>: <source>", a
 * static or type error a W3C code such as XPTY0004.
 * @param {string} xpath - Xpath expression
 * @return {boolean} - True when it compiles or fails only on a type
 */
const compiles = function(xpath) {
  let ok = true
  try {
    compileXPathToJavaScript(xpath, evaluateXPath.ALL_RESULTS_TYPE, {
      namespaceResolver: (prefix) =>
        Object.hasOwn(STANDARD, prefix) ? STANDARD[prefix] : FUNCTIONS,
    })
  } catch (err) {
    ok = CODED.test(String(err.message))
  }
  return ok
}

/**
 * Whether given Xpath expression is syntactically valid. The same engine that
 * runs the rules parses it, so an expression is valid here exactly when the
 * processor can parse it. Every prefix resolves, isolating syntax from
 * unresolved-prefix errors. The namespace axis is the one construct the engine
 * cannot parse yet the older dialects allow, so an expression that parses once
 * its namespace:: axis is rewritten to a supported one is valid too.
 * @param {string} xpath - Xpath expression
 * @return {boolean} - True when the expression parses
 */
const isValid = function(xpath) {
  return compiles(xpath) ||
    (NAMESPACE_AXIS.test(xpath) &&
      compiles(xpath.replace(/namespace\s*::/g, 'child::')))
}

module.exports = {
  nodes,
  strings,
  isValid,
}
