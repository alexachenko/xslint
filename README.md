# xslint

Lint your XSL/XSLT stylesheets — catch malformed XML, invalid XPath, and
stylistic defects before they ship.

[![DevOps By Rultor.com](https://www.rultor.com/b/maxonfjvipon/xslint)](https://www.rultor.com/p/maxonfjvipon/xslint)

[![npm](https://img.shields.io/npm/v/@maxonfjvipon/xslint.svg?style=flat)](https://www.npmjs.com/package/@maxonfjvipon/xslint)
[![grunt](https://github.com/maxonfjvipon/xslint/actions/workflows/grunt.yml/badge.svg)](https://github.com/maxonfjvipon/xslint/actions/workflows/grunt.yml)
[![codecov](https://codecov.io/gh/maxonfjvipon/xslint/branch/master/graph/badge.svg)](https://codecov.io/gh/maxonfjvipon/xslint)
[![PDD status](http://www.0pdd.com/svg?name=maxonfjvipon/xslint)](http://www.0pdd.com/p?name=maxonfjvipon/xslint)
[![Hits-of-Code](https://hitsofcode.com/github/maxonfjvipon/xslint)](https://hitsofcode.com/view/github/maxonfjvipon/xslint)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/maxonfjvipon/xslint/blob/master/LICENSE.txt)

`xslint` is a CLI linter for XSL stylesheets. It first checks that every
stylesheet is well-formed and every XPath expression compiles, then runs 49
checks for stylistic, semantic, and logical problems — each reported with its
exact line and column, in your terminal or in CI.

## Quick start

Run it on your stylesheets — no install needed:

```bash
npx @maxonfjvipon/xslint@latest path/to/stylesheets
```

Given a stylesheet like this:

```xml
<?xml version="1.0"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="//book">
    <xsl:variable name="x" select="title"/>
    <xsl:value-of select="$x"/>
  </xsl:template>
</xsl:stylesheet>
```

xslint points at each problem with its exact position and how to fix it:

```text
[ERROR] sheet.xsl(2:1) The xsl:output instruction is missing. Declare it to specify the serialization format explicitly. (not-using-output)
[WARNING] sheet.xsl(3:3) The match attribute of xsl:template starts with //, which scans the entire document tree. Use a more specific pattern. (starts-with-double-slash)
[WARNING] sheet.xsl(4:5) A variable, function, or template has a single-character name. Use a descriptive name that reveals intent. (short-names)
```

In CI, use the [GitHub Action](https://github.com/maxonfjvipon/xslint-action) to
get inline annotations on your pull requests:

```yaml
- uses: actions/checkout@v6
- uses: maxonfjvipon/xslint-action@0.0.5
```

Browse all 49 checks in the [check catalog](https://maxonfjvipon.github.io/xslint/).

## Installation

To install `xslint` globally, install [npm] first, then run:

```bash
npm install -g @maxonfjvipon/xslint@latest
xslint --version
```

## Build

To build `xslint` from source, clone this repository:

```bash
git clone git@github.com:maxonfjvipon/xslint.git
cd xslint
```

Next, run these commands to install `xslint` system-wide:

```bash
npm install
npm install -g .
```

Verify that `xslint` is installed correctly:

```bash
$ xslint --version
0.0.0
```

## Usage

You can check all files in current directory:

```bash
xslint
```

To check specified files - provide them as arguments:

```bash
xslint path/to/your/file1.xsl path/to/your/file2.xsl
```

You can suppress some [checks][checks] by using `--suppress` option:

```bash
xslint --suppress=confusing-variable-and-node
```

You can skip several checks at once if they contain a certain substring:

```bash
xslint --suppress=unused
```

If you want to suppress many checks, use `--suppress` as many times as you need:

```bash
xslint --suppress=monolithic-design --suppress=short-names
```

## Configuration

Project-wide settings live in a `.xslint.yml` file, discovered by walking up
from the current directory (or passed with `--config <path>`). Command-line
flags override the file, and the file overrides the built-in defaults.

```yaml
# .xslint.yml
rules:
  short-names: off       # turn one check off
  "unused-*": error      # or a family, by glob
exclude:
  - "test/**"                           # globs to skip, relative to this file
max-warnings: 10                        # default for --max-warnings
log-level: info                         # default for --log-level
quiet: false                            # default for --quiet
```

- **`rules`** maps a check name — or a glob such as `unused-*` — to
  `off`, `warning`, or `error`. `off` disables the check (like `--suppress`);
  `warning` and `error` re-grade its severity.
- **`exclude`** lists globs, relative to the config file's own directory, whose
  matching files are not linted.
- **`max-warnings`**, **`log-level`**, and **`quiet`** set the defaults for the
  matching command-line flags.

Unknown top-level keys, rule names that match no check, and values of the wrong
type (a non-numeric `max-warnings`, a non-list `exclude`, a non-boolean
`quiet`, a non-string `log-level`) are reported and ignored, so typos do not
pass silently.

## Inline suppression

Silence a rule in one place with an XML-comment directive. Rule names are
optional and space-separated; with none, every rule at that location is
suppressed.

```xml
<!-- xslint-disable-next-line short-names -->
<xsl:variable name="x" select="1"/>

<!-- xslint-disable-file not-using-schema-types -->
```

- **`xslint-disable-next-line [rules]`** — the line after the comment.
- **`xslint-disable-line [rules]`** — the comment's own line.
- **`xslint-disable-file [rules]`** — the whole file (put it near the top).

A directive that suppresses nothing is reported as unused, so stale ones can be
found and removed.

## Output

Defects are written to stdout; progress and diagnostic logs go to stderr, so
`xslint path/to/dir > report.txt` captures only the findings. Pass `--quiet` to
drop the informational log lines:

```bash
xslint --quiet
```

Output is colored only when it goes to an interactive terminal, so a redirected
or piped run stays plain text; setting the conventional `NO_COLOR` environment
variable turns coloring off everywhere.

## Machine-readable output

`--format` selects the output. `text` (the default) is the human format above;
`json` and `sarif` print a single document to stdout — logs stay on stderr, so
the document is clean to pipe or redirect; `github` prints GitHub Actions
workflow commands:

```bash
xslint --format json path/to/dir     # a flat array of defects
xslint --format sarif path/to/dir    # a SARIF 2.1.0 log
xslint --format github path/to/dir   # ::warning/::error annotations for CI
```

Inside a GitHub Action, `--format github` makes each defect an inline
annotation on the pull-request diff with no upload step — the lowest-friction
way to see findings on a review.

SARIF feeds GitHub code scanning, so xslint findings appear as annotations on
pull requests:

```yaml
- run: xslint --format sarif . > xslint.sarif || true
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: xslint.sarif
```

The `|| true` keeps a findings exit code from failing the step before the
upload; the alerts still surface in code scanning. Run it from the repository
root so the reported paths stay repo-relative — a file outside the working
directory is named by its absolute path instead.

## Exit code

`xslint` exits non-zero when any `error`-severity defect is found. Warnings do
not fail the run by default; to make them count, cap the allowed number with
`--max-warnings`:

```bash
xslint --max-warnings=0    # any warning fails the run
xslint --max-warnings=10   # more than ten warnings fails the run
```

## Checks

The full list of checks with descriptions and examples is available at
[maxonfjvipon.github.io/xslint][checks].

xslint runs in two stages. **Validators** first establish that the input is
valid; **linters** then run over the stylesheets that pass, catching
stylistic, semantic, and logical problems. A stylesheet that does not parse is
reported once and skipped, so one broken file never hides the feedback on the
rest.

Validators:

- **XML well-formedness** — a stylesheet that is not well-formed XML is
  reported and excluded from linting.
- **XPath syntax** — every bare XPath expression (in `select`, `test`,
  `use`, `value`, `group-by`, `group-adjacent`, and the XSLT 3.0 `key`,
  `initial-value`, `xpath`, `context-item`, `with-params`,
  `namespace-context`) is parsed; the ones the processor cannot parse are
  reported.

Linters:

- **Per-file** checks evaluate one stylesheet at a time (most checks).
- **Cross-file** checks reason across all the stylesheets you lint together.
  For example, a named template defined in one file but invoked from another
  (via `xsl:import`/`xsl:include`) is not reported as unused. Lint the whole
  project at once so these checks can see every caller.
- **Formatting** checks read each XPath expression as a stream of tokens and
  flag stylistic noise — currently redundant whitespace (a doubled space, or a
  space leading or trailing the expression). Only expressions that already
  parse are checked, so a malformed one is reported once by the validator and
  never nagged about its spacing.

## How to Contribute

Fork repository, make changes, then send us a [pull request][guidelines].
We will review your changes and apply them to the `master` branch shortly,
provided they don't violate our quality standards. To avoid frustration,
before sending us your pull request please make sure all your tests pass:

```bash
npm test
```

New linter rules live in `src/resources/checks/xpath` (per-file) or
`src/resources/checks/corpus` (cross-file), each with a matching test pack in
`test/resources`. The validators in `src/resources/checks/validation` and the
formatting checks in `src/resources/checks/format` are fixed in code; their
YAML only tunes severity and message. Regenerate the documentation site with
`npx grunt docs`.

You will need [npm] and [node] installed

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow and
[CHANGELOG.md](CHANGELOG.md) for release notes.

[npm]: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
[node]: https://nodejs.org/en
[guidelines]: https://www.yegor256.com/2014/04/15/github-guidelines.html
[checks]: https://maxonfjvipon.github.io/xslint/
