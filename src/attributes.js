/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

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
 * XPath selecting every attribute that could hold XPath, across the document.
 * @type {string}
 */
const SELECTOR = ATTRIBUTES.map((name) => `//@${name}`).join(' | ')

module.exports = {
  ATTRIBUTES,
  SELECTOR,
}
