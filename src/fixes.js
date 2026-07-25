/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

/**
 * A fix that deletes an attribute, leading space and all. The text to remove is
 * reconstructed from the attribute — ` name="value"` — so the fixer's verify
 * step applies it only when the source is exactly that, skipping a
 * single-quoted or oddly spaced attribute rather than cutting the wrong span.
 * @param {Node} attribute - The attribute node to delete
 * @return {{line: number, col: number, value: string, replacement: string}} -
 *  The fix
 */
const deletion = function(attribute) {
  return {
    line: attribute.lineNumber,
    col: attribute.columnNumber - attribute.name.length - 2,
    value: ` ${attribute.name}="${attribute.value}"`,
    replacement: '',
  }
}

module.exports = {
  deletion,
}
