# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries for releases before this file was introduced record their npm
publication date only; detailed notes begin with the Unreleased section.

## Unreleased

## 0.0.14 - 2026-07-28

- Make the `starts-with-double-slash` and `use-double-slash` messages honest.
  They blamed a "document scan" that a match pattern never performs; they now
  say a leading `//` is redundant and an inner `//` matches at any depth,
  matching the motives corrected earlier (#423).

- Drop the `not-using-schema-types` check. It fired on a 2.0/3.0 stylesheet that
  used no `xs:` type anywhere — an arbitrary "use at least one type" rule that a
  single token type silenced and that flagged perfectly valid untyped
  stylesheets. A precise per-binding replacement is parked in #430 (#423).

- Refresh the real-code proof after the check audit: 1,974 findings across 22
  checks on the same 70 DocBook/TEI/DITA files (was 2,019 across 23), and bump
  the stale install-example version in the README (#423).

## 0.0.13 - 2026-07-28

- Drop the `unsorted-imports` check. Ordering `xsl:import` elements alphabetically
  can change import precedence — a later import overrides an earlier one on a
  template conflict — so advising that reorder risked changing behavior (#423).

- Rework the size and count checks into one coherent band, split by node type so
  they never double-report (#423):
  - `too-many-small-templates` → **`too-many-templates`**: fire when a stylesheet
    declares ten or more `xsl:template`, whatever their size, since a file with
    that many templates is hard to read (breaking: the `--suppress`/config name
    changes).
  - `function-template-complexity` → **`function-complexity`**: look only at
    `xsl:function` (more than 50 elements); a large template is a different smell
    (breaking rename).
  - `monolithic-design` → **`oversized-template`**: fire on a single
    `xsl:template` holding more than 100 XSLT elements, rather than on any
    one-template stylesheet — a small one-template sheet is fine, an undecomposed
    hundred-element one is not (breaking rename).

- Rewrite four check motives to argue their real rationale instead of a false
  one. `missing-id-in-stylesheet` and `not-using-output` are consistency rules,
  not technical necessities — an `id` does nothing on a standalone stylesheet,
  and the default output method is defined by the spec rather than left
  implementation-defined. `use-double-slash` and `starts-with-double-slash`
  are about over-broad, under-specific match patterns, not a "full document
  scan" that a match pattern never performs (#423).

## 0.0.12 - 2026-07-27

- Fix a family of false positives surfaced by linting real-world XSLT
  (DocBook-XSL, TEI, DITA-OT, and objectionary/eo):
  - `invalid-xpath-expression` no longer rejects XPath 1.0 numeric coercion
    such as `substring-before(...) - 1`, nor the `namespace::` axis (#396,
    #402).
  - `malformed-stylesheet` tolerates internal-subset entity declarations, and
    declared entities are resolved before linting (#395, #403).
  - `unused-function` and `unused-variable` now follow usage across the whole
    corpus, so a definition in a `_funcs.xsl`/`_specials.xsl` library used from
    an importing stylesheet is no longer flagged (#407).
  - `incorrect-use-of-boolean-constants` fires only on a bare boolean constant
    in an `xsl:if`/`xsl:when` test, not on string comparisons or output (#409).
  - `empty-content-in-instructions` leaves an empty `xsl:when`/`xsl:otherwise`
    alone; only `xsl:if`/`xsl:for-each` are flagged (#411).
  - `stylesheet-has-no-templates` and `not-using-output` exempt library modules
    that have no templates (#412, #414).
  - `null-output-from-stylesheet` no longer flags an empty node-suppressing
    template (#413).

- Add a `.pre-commit-hooks.yaml` so xslint can run as a pre-commit hook.

- Turn the documentation-site index into a landing page and add a "proven on
  real code" section.

## 0.0.11 - 2026-07-27

- Move the project to the `xslint` GitHub organization; the repository,
  homepage, and documentation-site URLs now point at `github.com/xslint`.

## 0.0.10 - 2026-07-26

- Expose a programmatic API: `lint(sources, {suppress, overrides})` returns the
  defects for in-memory `{file, content}` sources without reading files,
  printing, or exiting, and `fixed` applies the fixes. The package `main` now
  points at this API (the CLI bin stays `src/index.mjs`), so editors and the
  planned LSP server (#336) can embed xslint instead of shelling out. The CLI
  is now a thin wrapper over `lint` (#336).

- Add three more `--fix-suggestions`, each a `src/fixers.js` registry entry:
  `output-method-xml` (switch `method="xml"` to `"html"`),
  `missing-version-in-stylesheet` (declare `version="1.0"`), and
  `mode-or-priority-without-match` (delete the orphan attribute, when exactly
  one of `mode`/`priority` is present) (#334).

- Add a suggestion tier to `--fix`. A fix marked `suggestion` is opinionated —
  it changes behavior, removes code, or is one of several valid corrections —
  so `--fix` leaves it and only the new `--fix-suggestions` applies it. A
  declarative xpath rule can now carry a fix through `src/fixers.js` without
  becoming a code-based linter; `using-disable-output-escaping` is the first
  suggestion (the attribute is deleted). A run without `--fix` now reports how
  many defects each option would fix (#334).

- Make `use-node-set-extension` fixable by `--fix`: it is now a code-based
  check (`src/node-set-linter.js`) that reports one defect per `node-set()`
  call in a `@select` of an XSLT 2.0/3.0 stylesheet, with a fix that unwraps it
  (`exsl:node-set($x)` → `$x`). It masks string and comment spans before
  matching, so a `node-set(` inside a literal is never flagged (#334).

- Make `redundant-namespace-declarations` fixable by `--fix`: it is now a
  code-based check (`src/namespace-linter.js`) that reports one defect per
  namespace prefix declared on the stylesheet but used nowhere, positioned at
  the declaration, with a fix that deletes it. Detection is unchanged; the now
  unused `xslint:in-scope-prefixes` custom XPath function was removed (#334).

- Make `unabbreviated-axis` fixable by `--fix`: it is now a token-aware check
  (`src/xpath-axis-linter.js`) that reports one defect per verbose axis and
  abbreviates it (`child::x`→`x`, `attribute::x`→`@x`, `parent::node()`→`..`).
  It reads every XPath and pattern attribute, so an axis in a template `match`
  is caught, and points at each occurrence rather than the whole element; a
  `parent::` with any other node test, having no short form, is no longer
  flagged (#334).

- Add a `--fix` mode (`--fix-dry-run` to preview) that rewrites the
  mechanically-fixable defects in place. It covers `redundant-whitespace`
  today: a check-agnostic engine (`src/fixer.js`) applies the `fix` a defect
  carries only when the flagged span still matches, leaving the rest of the
  file byte-for-byte intact (#334).

- Add a scheduled workflow that keeps the `xslint-action` version in the README
  current, opening a PR when the action publishes a new release (#357).

- Enforce a 100-character line length for Markdown (code blocks and tables
  exempt); `CLAUDE.md`, a dense one-line-per-paragraph reference, is exempt
  (#355).

## 0.0.9 - 2026-07-24

- Fix the release workflow: read the changelog for the GitHub Release notes and
  set them with `gh release edit` (falling back to create) rather than failing
  on Rultor's existing release, and stop pushing the changelog to the protected
  `master` — the changelog is now promoted in the pre-tag pull request (#349).

## 0.0.8 - 2026-07-24

- Declare `repository` (so `npm publish --provenance` validates) and a
  `files` allowlist that ships only `src`, keeping `coverage`, tests, and the
  dev-only `patches` out of the published package (#346).

- Publish releases from a GitHub Actions workflow via npm OIDC trusted
  publishing (no token to rotate, with provenance), promoting the changelog and
  cutting a GitHub Release; `@rultor release` still validates, tests, and pushes
  the tag that triggers it (#343).

- Authenticate Codecov uploads with `CODECOV_TOKEN`, so coverage reports upload
  and the badge reflects real coverage (#341).

- Add a `--format github` reporter that prints GitHub Actions workflow
  commands, so findings render as inline annotations on the pull-request diff
  with no SARIF-upload step (#333).

- Evaluate suppression once per run in the per-file XPath linter instead of
  re-checking it for every file, matching the other linters (#331).

- Run the coverage gate in Rultor's merge and release builds, so a drop below
  100% blocks the merge and the release rather than only annotating the pull
  request (#328).

- Type the `TOKENS` map with a non-drifting index signature instead of a
  hand-maintained key-by-key literal that had fallen out of sync (#327).

- Count every `src` file toward the 100% coverage gate (`c8` `all`), so a module
  shipped without a test now fails CI instead of being silently omitted (#322).

- Extend the `node:`-prefix ban from `require` to ESM `import` as well, and use
  bare specifiers in `eslint.config.mjs` (#319).

- Name an out-of-tree file by its absolute path in `json`/`sarif` output rather
  than a `..`-climbing relative path that GitHub code scanning cannot map
  (#320).

- Parse the corpus checks once at module load instead of on every run, matching
  the other linters and validators (#317).

- Send a fatal CLI error's stack trace to stderr instead of stdout, so stdout
  stays clean for defects and machine-readable output (#318).

- Reach 100% statement, branch, function, and line coverage and raise the
  gate from 90% to 100% (the CLI bootstrap `src/index.mjs` is excluded, as it
  already is from mutation testing) (#305).
- Add a project-local ESLint rule that bans a redundant return variable
  (`const x = expr; return x`), so the convention is enforced on new code
  (#310).
- Load the CLI entry as an ES module (`src/index.mjs`) so `commander` — which
  is ESM-only — no longer triggers Node's `ExperimentalWarning` on every run;
  the test harness no longer silences warnings, so it sees what users see
  (#300).
- Report a stylesheet as malformed for any well-formedness problem the XML
  parser reports, not only the fatal ones — an undefined entity or a stray
  `<` no longer slips through — and route the parser's own diagnostics through
  the logger instead of leaking them to the console (#298).
- Assert behavior rather than whole-corpus totals in the end-to-end tests, so
  adding a fixture or a rule no longer breaks an unrelated test (#303).
- Use bare module names in `require` (drop the `node:` prefix) and enforce it
  with an ESLint rule; collapse the duplicate `warn`/`warning` naming in the
  logger and writer (#304).
- Apply `--log-level`/`--quiet` before reading the configuration, rule
  patterns, and suppressions, so a raised level now silences their warnings
  too (#299).
- Color output only for an interactive terminal and honor `NO_COLOR`, so
  redirected or piped output no longer carries raw ANSI escapes (#302).
- Report and ignore `.xslint.yml` values of the wrong type — a non-numeric
  `max-warnings` no longer silently disables the warning gate (#301).
- Add machine-readable output: `--format json` and `--format sarif` (SARIF
  2.1.0, for GitHub code scanning) alongside the default `text` (#260).
- Add inline suppression directives — `xslint-disable-next-line`,
  `xslint-disable-line`, and `xslint-disable-file` (#262), and report a
  directive that suppresses nothing as unused (#288).
- **Breaking:** drop the `template-match-` prefix from every rule name and
  rationalize a few awkward ones, so `--suppress` strings and config `rules`
  keys change accordingly; add a conformance test that enforces rule naming,
  motives, and test packs (#258).
- Add a `.xslint.yml` configuration file — rule severities and globs,
  `exclude`, `max-warnings`, `log-level`, `quiet` — resolved with `--config`
  and walk-up discovery (#261, #282, #283, #284, #285).
- Add c8 coverage measurement with a 90% gate and a Codecov badge (#265).
- Add scheduled Stryker mutation testing (#266).
- Parse each XPath rule once at load instead of once per file (#256).
- Compute each tokenizer probe once per position (#255).
- Apply the schema-type and node-set rules to XSLT 3.0 stylesheets (#259).
- Make the exit code severity-aware and add `--max-warnings` (#264).
- Send logs to stderr and defects to stdout, and add `--quiet` (#263).
- Add round-trip and offset property tests for the tokenizer (#267).
- Point the README badges at this repository (#254).

## 0.0.6 - 2026-06-29

- Published to npm.

## 0.0.5 - 2026-03-26

- Published to npm.

## 0.0.4 - 2026-03-12

- Published to npm.

## 0.0.3 - 2025-01-22

- Published to npm.

## 0.0.2 - 2025-01-22

- Published to npm.

## 0.0.1 - 2025-01-07

- First release to npm.
