# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries for releases before this file was introduced record their npm
publication date only; detailed notes begin with the Unreleased section.

## Unreleased

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
