# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository. Keep it
accurate: a change to behavior that leaves this file describing the old one is
not done.

## Git workflow

Always start from a clean master:

```bash
git checkout master
git pull origin master
```

## Commands

```bash
npm test                                        # ESLint then all tests (Grunt)
npx mocha test/xslint.test.js --timeout 10000   # one test file
npx mocha test/xslint.test.js --grep sentence   # tests matching a pattern
npx grunt docs                                  # regenerate the docs/ site
npm run coverage                                # 100% branch gate (CI)
```

CI also runs, as separate jobs beyond `npm test`: `coverage`, `xcop`,
`copyrights` (SPDX header on every source file), `markdown-lint`, `yamllint`,
`typos`, `pdd`, and `fixtures`. A green local `npm test` does not mean CI is
green — run `npm run coverage` and the xcop suite too.

## Code style

ESLint (`eslint-config-google` + `@stylistic`, config in `eslint.config.mjs`,
run by the `lint` job) enforces: spaced operators, no single-letter names
(`id-length` >= 2), postfix `x++` only (prefix `++x` is banned), bare module
names in `require`/`import` (no `node:` prefix), and no redundant return
variable (`const x = expr; return x` is banned — return the expression). The
last is a project-local rule in `eslint-local-rules.js`, unit-tested in
`test/eslint-local-rules.test.js`.

**Every style or consistency convention must be machine-enforced.** When you fix
one, do not just fix the instances — in the same change add a check that fails on
the next violation (prefer a new `no-restricted-syntax` selector so no dependency
is added, else a CI job).

## Architecture

**xslint** is a CLI linter for XSL stylesheets. It runs in two stages.
**Validators** first establish that the input is valid; **linters** then run only
over what passed. Each validator *partitions* its input — it hands the valid part
to the next stage and reports the rest — so one broken file, or one malformed
expression, never hides the feedback on everything else.

```text
src/index.mjs             CLI entry (commander.js, ESM)
  src/xslint.js           discovery, config, run order, output; exports lint()
    validators — partition the input, report the bad part:
      src/xsl-validator.js       well-formed XML  -> builds the corpus
      src/xpath-validator.js     XPath syntax     -> keeps the valid expressions
    document linters — (corpus, suppressions) => defects:
      src/xpath-linter.js        declarative checks/xpath/*.yaml (per file)
      src/corpus-linter.js       declarative checks/corpus/*.yaml (cross file)
      src/*-linter.js            code-based checks/format/*.yaml (one construct each)
    expression linters — (expressions, suppressions) => defects:
      src/xpath-format-linter.js checks/format/redundant-whitespace.yaml
```

`src/xslint.js` exposes the whole staging as a pure function,
`lint(sources, {suppress, overrides}) => defects`: no file I/O, prints nothing,
never exits. The command-line `xslint(paths, options)` in the same module wraps
it — resolves config, reads the `.xsl` files, calls `lint`, applies `--fix`,
reports, and sets the exit code. The package `main` re-exports `lint` and
`fixed` so an embedder (the planned LSP server, #336) can lint a buffer without
shelling out; the bin stays `src/index.mjs`.

A check is one entry with **four kinds**, each a YAML file plus a motive plus a
test pack:

| Kind | YAML | Detection | Reported node |
| --- | --- | --- | --- |
| `xpath` | `xpath` + `severity` + `message` | the XPath selects violations | selected node |
| `corpus` | `declaration`/`usage` (+ `reference`/`scoped`/`reachable`) | cross-file, declarative | the declaration |
| `validation` | `severity` + `message` | code (well-formedness, XPath syntax) | in code |
| `format` | `severity` + `message` | code (a `src/*-linter.js`) | in code |

No linter imports another. The declarative loaders (`xpath-linter`,
`corpus-linter`) and the token/DOM linters all share `src/xpath.js` (the
fontoxpath environment: prefixes, evaluators, `isValid`), `src/tokens.js` (the
positioned XPath lexer), and `src/helpers.js` (XML/YAML parsing, file
recursion). The staging is wired only in `src/xslint.js`: each linter is one
`{run, checks}` entry in `LINTERS`/`EXPRESSION_LINTERS`, and the `CHECKS` name
list that `--suppress` and config globs match is *derived* from those entries, so
a linter and its suppression names cannot drift apart.

XPath binds prefix `xsl:` to the XSLT namespace; `xslint:` is reserved in
`src/xpath.js` for custom functions (none are registered now).

## Check formats

Per-file rule — `src/resources/checks/xpath/<name>.yaml`:

```yaml
xpath: <XPath selecting the violation nodes>
severity: warning|error
message: <one sentence, no trailing period>
```

Cross-file rule — `src/resources/checks/corpus/<name>.yaml`:

```yaml
declaration: <XPath selecting declared nodes that carry an @name>
usage: <XPath selecting the used names, across the whole corpus>
reference: "<optional substring template; {name} stands for the @name>"
scoped: <optional true>
reachable: <optional true>
severity: warning|error
message: <one sentence>
```

Without `reference`, a `declaration` is a defect when its `@name` matches no
`usage` value by exact identity. With `reference`, the match is by substring:
plain (defect when the string occurs nowhere, counting the declaration's own
body), `reachable: true` (follows the call graph — a defect when referenced yet
never reached from outside every declaration body), or `scoped: true` (counts
usage only within the declaration's subtree, or an importing file). Because usage
is followed across files, a symbol defined in a `_funcs.xsl` library and used
elsewhere is never flagged.

Validator and format checks — `checks/{validation,format}/<name>.yaml` — carry
only `severity` and `message`; their logic lives in code and the YAML just tunes
those two.

## Adding a rule

Names are kebab-case with no `template-match-` (or other noise) prefix. Every
rule needs a motive (`src/resources/motives/<kind>/<name>.md`) and at least one
test. `test/conformance.test.js` enforces the naming, the motive, and the
pack/test coverage for all four kinds — a rule that misnames itself, drops its
motive, or ships untested fails the build.

- **xpath rule**: add `checks/xpath/<name>.yaml` and
  `test/resources/xpath-packs/<name>.yaml`.
- **corpus rule**: add `checks/corpus/<name>.yaml` and
  `test/resources/corpus-packs/<name>.yaml`.
- **validation/format check**: the logic is code (a validator, or a
  `src/*-linter.js` wired into `LINTERS`); the YAML only tunes `severity` and
  `message`. A code-based format linter builds its defects through `src/checks.js`
  (`metaOf`, `suppressed`, `defect`) and scans `src/attributes.js`'s `SELECTOR`
  (every XPath/pattern attribute) unless it has a documented reason to narrow.

Then run `npm test`, `npm run coverage`, and `npx grunt docs`.

### Mandatory rules

- **Version-dependence.** If a check's detection or fix is valid only for certain
  XSLT versions, the version test is part of the check. Read the version from
  `documentElement.getAttribute('version')` against `MODERN = ['2.0', '3.0']`
  (code), or from `/*/@version` (a declarative rule — any root). Never emit a fix
  the declared version cannot run; emit the version-appropriate form instead
  (`count(x) > 0` -> `exists(x)` on 2.0+, `boolean(x)`/`x` on 1.0). A
  version-sensitive check with no version guard is a bug. Verify a version-based
  *exclusion* fires on the versions where its premise does not hold — an inert 2.0
  attribute in a 1.0 sheet is still a defect.
- **Root-robustness.** A declarative rule that anchors on the stylesheet root must
  match both spellings: `(/xsl:stylesheet | /xsl:transform)[...]`, never
  `/xsl:stylesheet[...]` — they are exact synonyms in every version. Broaden a
  descendant root test too (`//(xsl:stylesheet | xsl:transform)`). A whole-rule
  root/version guard belongs at the root step (`/*[guard]//x`), not nested in a
  per-node predicate; nest it only when it gates a sub-clause. This is
  machine-enforced by `test/conformance.test.js`.
- **Fix in the same change.** If a check is fixable, land the fix with the
  detection — never defer it. A declarative rule gets a `node => fix` builder in
  `src/fixers.js`; a code-based linter attaches the `fix` to its defect. Mark it
  `suggestion: true` unless the edit is deterministic and semantics-preserving.
  Cover it with a committed `test/resources/fix/<name>.{xsl,fixed.xsl}` pair
  (generate the `.fixed` by running `--fix`) plus rows in `test/fixer.test.js`'s
  `APPLIED`/`UNCHANGED`/`DROPPED` tables. A check whose only correct fix is
  structural stays report-only until the full-fidelity parser (#228) — say so in
  its motive.
- **Motive sync.** When you touch what a check flags — its severity, its fix or
  fix tier, its version scope, the constructs it leaves alone — re-read its motive
  and update it. The motive is where the end user learns the check's purpose; a
  behavior change with an untouched motive is presumed a bug.
- **Docs sync.** A behavior change must also update `README.md` (user-facing:
  usage, the `--fix`/suggestion lists), this file (architecture), and the docs
  site (`npx grunt docs`).

## Test packs

Each linter owns a `test/resources/<name>-packs/` directory, auto-discovered by
its harness — no registration. A pack is `pack` (the check name), `found`, and
`input` (or `inputs` for corpus/import packs, which reference each other as
`file<index>.xsl`). `found` carries `amount` and `positions` — `[line, col]`, or
`[fileIndex, line, col]` for cross-file packs, or `[line, col, other-check]` for
a co-firing check. A code-based linter's pack also carries `found.fixes` aligned
with `positions` (the expected `fix.replacement`, `null` for report-only), which
the harness asserts too.

- **Test the hard cases.** A pack must exercise more than one clean, top-level
  occurrence: the construct **buried** in a larger expression (a predicate, an
  `and`/`or` operand, a nested call), **three or more** occurrences in one
  expression (to catch a first-match bug), and the **negative neighbours** that
  look similar but must not fire. Positions pin every occurrence.
- **Fixtures live in files.** Every test stylesheet is a committed `.xsl` under
  `test/resources/` (never inline in a `.test.js` — the `fixtures` CI job bans
  inline `<?xml`/`<xsl:`); YAML is only for the multi-field packs. Malformed
  fixtures go in `test/resources/malformed/` (excluded from the xcop workflow,
  since malformed XML cannot pass a formatting check).
- **xcop.** `test/xcop.test.js` re-serializes the inline XSL of every `*-packs`
  directory and runs [xcop](https://github.com/yegor256/xcop) over it; the CI
  `xcop` job runs it too. The `redundant-namespace-declarations` pack is listed in
  `UNFORMATTED` because its fixture must carry the unused namespace the check
  flags, which xcop would canonicalize away.
- **Table-driven.** Where several `it` blocks differ only in data, express them as
  a data array plus one generator, not repeated blocks. When adding a test, add a
  row to the matching table (`test/fixer.test.js`, the pack harnesses,
  `test/config.test.js`, ...) before writing a new block.

## User configuration

- **Suppress**: `xslint --suppress=<rule-substring>` matches names across every
  validator and linter.
- **Config**: `.xslint.yml` (found by walking up, or `--config <path>`) can turn
  rules `off`, re-grade severity, `exclude:` file globs, and default
  `max-warnings`/`log-level`/`quiet`. Flags override the file overrides the
  defaults (`src/config.js`). Unknown keys and no-match patterns are reported.
- **Inline directives**: XML comments `xslint-disable-next-line`,
  `xslint-disable-line`, `xslint-disable-file`, each with optional space-separated
  rule names (`src/directives.js`); an unused directive is reported.
- **Fix tiers**: a defect is fixable when it carries
  `fix: {line, col, value, replacement, suggestion?}`. A *safe* fix
  (deterministic, semantics-preserving) is applied by `--fix`; a
  `suggestion: true` fix (changes behavior, or is one of several corrections) is
  applied only by `--fix-suggestions`. `--fix-dry-run` writes nothing.
  `src/fixer.js` locates each fix by decode-walking the raw source, so a `>`
  written `&gt;` (#518) or a span shifted by an earlier entity (#525) still fixes,
  and an already-edited span is skipped rather than corrupted.

## Key files

| File | Role |
| --- | --- |
| `src/xslint.js` | Orchestrates discovery, config, staging, output; exports the pure `lint` (package `main`) and `fixed` |
| `src/config.js` | Resolves `.xslint.yml` (severities/`off`, excludes, `max-warnings`) |
| `src/directives.js` | Parses inline `xslint-disable-*` comment directives |
| `src/reporters.js` | `reporterOf(format)` — `text`, `json`, `sarif`, or `github` output |
| `src/xsl-validator.js` | Builds the corpus; reports each non-well-formed stylesheet |
| `src/xpath-validator.js` | Splits corpus expressions into valid (kept) and malformed (reported) via `isValid` |
| `src/xpath-linter.js` | Loads `checks/xpath/*.yaml`; attaches any `src/fixers.js` fix |
| `src/corpus-linter.js` | Loads `checks/corpus/*.yaml`; cross-file rules |
| `src/*-linter.js` | Code-based `checks/format/*.yaml`, one construct each (axis, namespace, count, name, ...); see the flow diagram |
| `src/checks.js` | Shared for code-based linters: `metaOf`, `suppressed`, `defect(check, meta, file, node, offset, fix)` |
| `src/attributes.js` | `ATTRIBUTES`/`SELECTOR` — every XPath/pattern attribute the scanners cover |
| `src/comparisons.js` | `comparedToZero` — shared scan for a call compared with `0`/`1` (count, string-length) |
| `src/expressions.js` | `masked`/`closes` lexer helpers (node-set, double-negation, boolean-call) |
| `src/tokens.js` | Positioned XPath lexer (`tokenized`, `TOKENS`), preserving whitespace |
| `src/import-graph.js` | Resolves `xsl:import`/`xsl:include` hrefs: `importsOf`, `graphOf` |
| `src/fixers.js` | Maps a declarative check name to a `node => fix` builder |
| `src/fixes.js` | Shared fix builders (`deletion(attribute)`) |
| `src/fixer.js` | Applies a defect's `fix` to source (decode-walk, verify-before-apply, end-to-start) |
| `src/xpath.js` | fontoxpath environment: prefixes, evaluators, `isValid` |
| `src/helpers.js` | XML parsing (expands internal-subset entities), YAML parsing, file recursion |
| `src/logger.js` | 4-level logger |
| `scripts/generate-docs.js` | Builds the `docs/` site from checks + motives |
| `test/conformance.test.js` | Enforces naming, motives, and pack/test coverage across all kinds |
| `test/xcop.test.js` | Runs xcop over the inline XSL of every `*-packs` directory |
