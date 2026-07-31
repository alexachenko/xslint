/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const quartet = function(alpha, beta, gamma, delta) {
  return [alpha, beta, gamma, delta]
}

const padded = function(alpha, beta = 7) {
  return alpha + beta
}

const heap = function(alpha, ...rest) {
  return [alpha, rest.length]
}

module.exports = {
  quartet,
  padded,
  heap,
}
