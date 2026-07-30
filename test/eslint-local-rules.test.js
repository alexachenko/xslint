/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const {RuleTester} = require('eslint')
const local = require('../eslint-local-rules')

const tester = new RuleTester({
  languageOptions: {ecmaVersion: 2022, sourceType: 'commonjs'},
})

tester.run(
  'no-redundant-return-variable',
  local.rules['no-redundant-return-variable'],
  {
    valid: [
      'function direct() { return make() }',
      'function used() { const one = make(); use(one); return one }',
      'function other() { const one = make(); return another }',
      'function pair() { const one = make(), two = one; return two }',
    ],
    invalid: [
      {
        code: 'function redundant() { const one = make(); return one }',
        errors: [{messageId: 'redundant'}],
      },
      {
        code: 'function sum() { let total = 1 + 2; return total }',
        errors: [{messageId: 'redundant'}],
      },
    ],
  },
)
