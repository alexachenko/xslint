 # CLAUDE.md

<!-- markdownlint-disable MD013 -->
<!-- This file is dense reference prose written one paragraph per line; the
     100-char line length is not enforced here. -->

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow

Always start work from a clean master:

```bash
git checkout master
git pull origin master
```

## Commands

```bash
npm test                      # Run all tests + ESLint (via Grunt)
npx mocha test/xslint.test.js --timeout 10000   # Run a single test file
npx mocha test/xslint.test.js --grep "sentence"  # Run tests matching a pattern
```

Code style is enforced by ESLint (`eslint-config-google` plus `@stylistic`, in `eslint.config.mjs`, run by the `grunt` job on every push and pull request): spaced operators (`@stylistic/space-infix-ops`), no single-letter names (`id-length` minimum 2), postfix-only increment/decrement (`no-restricted-syntax` bans prefix `++x`/`--x`; `x++` is fine), bare module names in `require` and `import` (`no-restricted-syntax` bans the `node:` prefix in both — write `require('path')`/`import ... from 'path'`, not the `node:`-prefixed form), and no redundant return variable (a project-local `local/no-redundant-return-variable` rule bans `const x = expr; return x` — return the expression directly).

**Every code-style convention must be machine-enforced.** When a style or consistency issue is fixed, do not just fix the instances — add an automated check that fails when the style is violated again (an ESLint rule, preferably a new `no-restricted-syntax` selector so no dependency is added, or a CI job), in the same change, so the mistake cannot recur.

## Architecture

**xslint** is a CLI linter for XSL stylesheets. It runs in two stages: **validators** first establish that the input is valid (each stylesheet is well-formed XML, and every XPath expression compiles), then **linters** run over what passed — the well-formed stylesheets, and the XPath expressions that parse — catching stylistic, semantic, and logical problems. Each validator *partitions* its input: it hands the valid part to the next stage and reports the rest, so one broken file (or one malformed expression) never hides the feedback on the rest.

Flow:
```text
src/index.mjs (CLI, commander.js — ESM entry so commander loads natively)
  → src/xslint.js (file discovery, suppression, run order, output: defects to
      stdout, logs to stderr)
    VALIDATORS (is it valid?) — each partitions its input, reporting the bad
    → src/xsl-validator.js (XML well-formedness) builds the corpus of
        parseable files          → src/resources/checks/validation/malformed-stylesheet.yaml
    → src/xpath-validator.js (XPath syntax, over the corpus) keeps the valid
        expressions              → src/resources/checks/validation/invalid-xpath-expression.yaml
    LINTERS (is it good?) — over the corpus
    → src/xpath-linter.js (per-file rules)    → src/resources/checks/xpath/*.yaml
    → src/corpus-linter.js (cross-file rules) → src/resources/checks/corpus/*.yaml
    → src/xpath-axis-linter.js (verbose axes in every XPath/pattern attribute;
        tokenizes via src/tokens.js) → src/resources/checks/format/unabbreviated-axis.yaml
    → src/namespace-linter.js (namespace prefixes declared but never used; pure
        DOM) → src/resources/checks/format/redundant-namespace-declarations.yaml
    → src/node-set-linter.js (redundant node-set() in @select on XSLT 2.0/3.0;
        masks literals via src/tokens.js) → src/resources/checks/format/use-node-set-extension.yaml
    EXPRESSION LINTERS (is it good?) — over the valid expressions
    → src/xpath-format-linter.js (XPath formatting; tokenizes via
        src/tokens.js)           → src/resources/checks/format/*.yaml
        xsl-validator, xpath-validator, xpath-linter, corpus-linter, and
        xpath-axis-linter evaluate via src/xpath.js (fontoxpath environment:
        prefixes, node/string evaluators, expression validator); namespace-linter
        walks the DOM directly; xpath-axis-linter and xpath-format-linter
        additionally tokenize via src/tokens.js — the former over every
        attribute's axes, the latter over the validator's expressions
```

Validators run before linters so the linters reason only over valid input, and each validator *builds* the input the next stage consumes. `xsl-validator` takes `(sources, suppressions)` (raw `{file, content}`) and returns `{corpus, defects}` — the corpus of parseable `{file, xsl}` documents. `xpath-validator` takes that corpus and returns `{expressions, defects}` — the valid `{file, expression}` attribute nodes, with the malformed ones dropped and reported. The document linters share the shape `(corpus, suppressions) => defects`: `xpath-linter` loops the corpus applying file-local rules; `corpus-linter` reasons across files (e.g. a named template defined in one file but invoked from another is *not* flagged as unused); `xpath-axis-linter` tokenizes every XPath/pattern attribute in the corpus and flags each verbose axis with a fix; `namespace-linter` walks the DOM for prefixes declared on the stylesheet but used nowhere, flagging each with a fix that deletes the declaration; `node-set-linter` finds the redundant `node-set()` extension in a `@select` of an XSLT 2.0/3.0 stylesheet, flagging each with a fix that unwraps it. The expression linters share the shape `(expressions, suppressions) => defects`: `xpath-format-linter` tokenizes each valid expression (`src/tokens.js`) and flags redundant whitespace — it never re-checks validity, since the validator already filtered. No module imports another linter or validator: `xpath-linter`, `corpus-linter`, `xpath-axis-linter`, `node-set-linter`, and `xpath-validator` depend on `src/xpath.js`, `xpath-axis-linter`, `node-set-linter`, and `xpath-format-linter` also on `src/tokens.js`, `namespace-linter` on neither (pure DOM), all on `src/helpers.js`; the staging is wired only in `src/xslint.js`.

`src/xslint.js` exposes that staging as a pure function, `lint(sources, {suppress, overrides}) => defects`, which does no file I/O, prints nothing, and never exits — it validates, runs every linter, applies severity overrides, and drops defects silenced by inline directives. The command-line `xslint(pths, options)` in the same module wraps it: it resolves configuration, discovers and reads the `.xsl` files into `sources`, calls `lint`, then applies `--fix` (writing files via `fixed`), reports, and sets the exit code. The package `main` is `src/xslint.js` and it re-exports `lint` and `fixed`, so an embedder — the planned LSP server (#336) — can lint an in-memory buffer and apply fixes without shelling out; the CLI bin stays `src/index.mjs`.

**Per-file rule format** (`src/resources/checks/xpath/<name>.yaml`):
```yaml
xpath: <XPath expression that selects violation nodes>
severity: warning|error
message: <human-readable explanation>
```

**Cross-file (corpus) rule format** (`src/resources/checks/corpus/<name>.yaml`):
```yaml
declaration: <XPath selecting declared nodes that carry an @name>
usage: <XPath selecting the names used, collected across the whole corpus>
severity: warning|error
message: <human-readable explanation>
```
A `declaration` node is a defect only when its `@name` appears in no `usage` value anywhere in the corpus.

**Validator check format** (`src/resources/checks/validation/<name>.yaml`):
```yaml
severity: warning|error
message: <human-readable explanation>
```
A validator carries no XPath rule — its detection logic lives in code, and the YAML supplies only the defect's `severity` and `message`. Two validators live here: `malformed-stylesheet` (`src/xsl-validator.js`, XML well-formedness) and `invalid-xpath-expression` (`src/xpath-validator.js`, XPath syntax). The latter parses every bare-XPath-expression attribute (`select`, `test`, `use`, `value`, `group-by`, `group-adjacent`, plus the XSLT 3.0 `key`, `initial-value`, `xpath`, `context-item`, `with-params`, `namespace-context` — the `EXPRESSIONS` selector in `src/xpath-validator.js`) via `isValid` (`src/xpath.js`), which compiles with fontoxpath (the same engine that runs the rules) under a resolver where every prefix resolves, so only genuine syntax errors fail — unknown prefixes, custom functions, and the implicit string-to-number coercion an XPath 1.0 stylesheet leans on (`substring-before(…) - 1`, a static-type mismatch the 3.1 engine rejects but not a parse error) do not. `isValid` tells the two apart by the shape of the engine's complaint: a syntax error is reported as `<position>: <source>`, a static or type error as a W3C code like `XPTY0004`, and only the former marks the expression malformed. The `namespace::` axis (dropped by XPath 3.0, defined by 1.0/2.0) is the one construct the engine cannot parse at all, so `isValid` retries with it rewritten to a supported axis and accepts the expression when only that rewrite makes it parse. Pattern attributes (`match`, `count`, `from`, `group-starting-with`, `group-ending-with`), attribute value templates, and sequence types (`as`) are deliberately not validated as expressions. Each validator reads its own YAML by name (it does not scan the directory), so adding one validator's YAML never feeds another's logic.

**Formatting check format** (`src/resources/checks/format/<name>.yaml`):
```yaml
severity: warning|error
message: <human-readable explanation>
```
Like a validator, a formatting check carries no XPath rule — its detection logic lives in code, and the YAML supplies only `severity` and `message`. Four checks live here, each code-driven but reading different input: `redundant-whitespace` (`src/xpath-format-linter.js`, an *expression* linter over the valid expressions the XPath validator kept — a doubled space, or a space leading or trailing the expression; whitespace inside string literals and comments is left alone), `unabbreviated-axis` (`src/xpath-axis-linter.js`, a *document* linter over the corpus — a verbose `child::`, `attribute::`, or `parent::node()` in any XPath or pattern attribute, reported once per occurrence with a fix that abbreviates it; it reads the corpus, not the expression stream, so an axis in a template `match` pattern is caught too, and the lexer keeps string literals whole so an axis-looking substring inside one is never touched), and `redundant-namespace-declarations` (`src/namespace-linter.js`, a *document* linter over the corpus — a namespace prefix declared on the stylesheet but used by no element name, attribute name, or qualified name in an attribute value; reported once per dead declaration with a fix that deletes it, walking the DOM directly rather than tokenizing), and `use-node-set-extension` (`src/node-set-linter.js`, a *document* linter over the corpus — the `exsl:node-set(…)` extension in a `@select` of an XSLT 2.0 or 3.0 stylesheet, where a variable is already a node sequence; reported once per call with a fix that unwraps it. It masks string and comment spans with the lexer, then finds the call and balances its parentheses on the blanked text, so a `node-set(` inside a literal is never flagged). `src/tokens.js` is the lexer the format checks lean on — a positioned token stream (string, comment, whitespace, axis, operator, and the rest) that preserves whitespace; it is the foundation a future full-fidelity parser grows on to reach structural checks (redundant parentheses).

XPath uses namespace prefix `xsl:` → `http://www.w3.org/1999/XSL/Transform`; the `xslint:` prefix is reserved in `src/xpath.js` for custom functions, though none are registered now (the one that existed, `in-scope-prefixes`, went away when `redundant-namespace-declarations` moved to `src/namespace-linter.js`).

**Per-file test pack** (`test/resources/xpath-packs/<name>.yaml`): `pack`, `found.amount`, `found.positions: [[line, col], ...]`, single `input`. Auto-discovered by `test/xpath-linter.test.js`.

**Corpus test pack** (`test/resources/corpus-packs/<name>.yaml`): `pack`, `found.amount`, `found.positions: [[fileIndex, line, col], ...]`, multiple `inputs: [ ... ]`. Auto-discovered by `test/corpus-linter.test.js`.

**XPath validator test pack** (`test/resources/xpath-validator-packs/<name>.yaml`): `pack`, `found.amount`, `found.positions: [[line, col], ...]`, single `input`. Auto-discovered by `test/xpath-validator.test.js`. The XSL validator is tested separately in `test/xsl-validator.test.js` with inline `{file, content}` sources (well-formed and malformed), and the end-to-end gating (parseable files linted, malformed ones reported and skipped) in `test/xslint.test.js` over a temp directory.

**XPath format test pack** (`test/resources/xpath-format-packs/<name>.yaml`): `pack`, `found.amount`, `found.positions: [[line, col], ...]`, single `input`. Auto-discovered by `test/xpath-format-linter.test.js`. The lexer is unit-tested separately in `test/tokens.test.js`.

**Axis test pack** (`test/resources/axis-packs/<name>.yaml`): `pack`, `found.amount`, `found.positions: [[line, col], ...]`, single `input`. Auto-discovered by `test/xpath-axis-linter.test.js`.

**Namespace test pack** (`test/resources/namespace-packs/<name>.yaml`): `pack`, `found.amount`, `found.positions: [[line, col], ...]`, single `input`. Auto-discovered by `test/namespace-linter.test.js`.

**Node-set test pack** (`test/resources/node-set-packs/<name>.yaml`): `pack`, `found.amount`, `found.positions: [[line, col], ...]`, single `input`. Auto-discovered by `test/node-set-linter.test.js`.

The `--fix` behavior of every fixable check is covered end-to-end in `test/fixer.test.js` over committed dirty/`.fixed` `.xsl` pairs under `test/resources/fix/`, copied into a temp file so the fixture is never mutated. Those dirty inputs are intentionally imperfect — the `redundant-namespace-declarations` one carries an unused namespace that xcop would canonicalize away — so `.github/workflows/xcop.yml` excludes `test/resources/fix/**` alongside the malformed fixtures.

**xcop formatting** — `test/xcop.test.js` extracts the inline XSL from every pack directory holding *well-formed* fixtures (`xpath-packs`, `corpus-packs`, `xpath-validator-packs`, `xpath-format-packs`, `axis-packs`, `namespace-packs`, `node-set-packs`), re-serializes it, and runs [xcop](https://github.com/yegor256/xcop) over it to verify the fixtures are well-formatted XML (skipped when `xcop` is not installed). The XML validator's malformed fixtures are deliberately not xcop-checked. A new pack directory of well-formed fixtures must be added to its `PACKS` list, or it goes unchecked.

**Stylesheet fixtures in tests** — every test stylesheet lives in a committed `.xsl` file under `test/resources/`, never inline in the test source; YAML is only for the multi-field packs (`pack`/`found`/`input`). Well-formed fixtures are linted by path and validated by the xcop workflow. Malformed fixtures live in `test/resources/malformed/` and are `.xsl` too, but the xcop workflow excludes that directory (it runs a pinned `xcop` with `--exclude`) because malformed XML cannot pass a formatting check. The `fixtures` CI job fails the build when any `.test.js` file contains an inline `<?xml` or `<xsl:`. The `should test default directory` test asserts only that the default scan announces `.` and processes a positive number of files, not an exact total, so adding a committed `.xsl` no longer breaks it.

## Adding a New Rule

Rule names are kebab-case with no `template-match-` (or other noise) prefix. Every rule needs a motive and at least one test pack. `test/conformance.test.js` enforces all three across `xpath` and `corpus` (naming and motives are enforced for `validation` and `format` too), so a rule that misnames itself, drops its motive, or ships without a pack fails the build.

Per-file rule:
1. Create `src/resources/checks/xpath/<rule-name>.yaml` with `xpath`, `severity`, `message`.
2. Create `test/resources/xpath-packs/<rule-name>.yaml` with matching `pack`, `found`, `input`.

Cross-file rule:
1. Create `src/resources/checks/corpus/<rule-name>.yaml` with `declaration`, `usage`, `severity`, `message`.
2. Create `test/resources/corpus-packs/<rule-name>.yaml` with matching `pack`, `found`, `inputs`.

Validators and formatting checks are not extended this way: their logic is fixed in `src/xsl-validator.js`, `src/xpath-validator.js`, `src/xpath-format-linter.js`, `src/xpath-axis-linter.js`, `src/namespace-linter.js`, and `src/node-set-linter.js`, and their YAML (`checks/validation/<name>.yaml` and `checks/format/<name>.yaml`) only tunes `severity` and `message`.

Then: add a rationale (required) at `src/resources/motives/{xpath,corpus,validation,format}/<rule-name>.md`, run `npm test`, and regenerate the doc site with `npx grunt docs`. A brand-new pack directory of well-formed fixtures must also be registered in `test/xcop.test.js` so its inline XSL is formatting-checked.

Suppression by users: `xslint --suppress=<rule-substring>` (matches names from all validators and linters).

Configuration by users: a `.xslint.yml` file (discovered by walking up from the working directory, or passed with `--config <path>`) can disable rules (`rules: {<name-or-glob>: off}`), re-grade severity (`warning`/`error`), skip files (`exclude:` globs, resolved relative to the config file's own directory), and set defaults for `max-warnings`, `log-level`, and `quiet`. Unknown top-level keys and rule patterns that match no check are reported. Inline suppression by users: XML-comment directives — `<!-- xslint-disable-next-line [rules] -->` (line after the comment), `<!-- xslint-disable-line [rules] -->` (the comment's line), `<!-- xslint-disable-file [rules] -->` (the whole file); rule names are optional and space-separated, and none means all. `src/directives.js` scans the raw text for them and `src/xslint.js` drops matching defects after collecting them (so it covers every kind, warns on an unknown rule name, and reports a directive that suppressed nothing as unused).

Command-line flags override the file; the file overrides the built-in defaults. Resolution lives in `src/config.js` (which also exposes the config's `base` directory); `src/xslint.js` expands each rule pattern against the check names, folds `off` rules into the suppression list, filters excluded files against `base`, applies severity overrides to the collected defects, and resolves the effective `max-warnings`/`log-level`/`quiet`.

Fixing by users: `xslint --fix` rewrites the mechanically-fixable defects in place (`--fix-dry-run` reports the same result without writing any file). A defect is fixable when it carries a `fix: {line, col, value, replacement, suggestion?}` — `xpath-format-linter` attaches one to each `redundant-whitespace` defect, `xpath-axis-linter` to each `unabbreviated-axis` defect, `namespace-linter` to each `redundant-namespace-declarations` defect (its `value` is the reconstructed ` xmlns:prefix="uri"` text, so the verify step skips a single-quoted or oddly spaced declaration rather than deleting the wrong span), and `node-set-linter` to each `use-node-set-extension` defect (a single span from `prefix:node-set(` through its matching `)`, replaced by the inner argument). A *declarative* xpath rule can carry a fix too, without becoming a code-based linter: `src/fixers.js` maps a check name to a `node => fix` builder, and `xpath-linter` attaches the fix that builder returns to each defect it finds for that check (a builder returns null when it cannot resolve the defect with one edit, and the linter then leaves the defect fix-less). The registry drives four suggestions — `using-disable-output-escaping` and `mode-or-priority-without-match` (delete an attribute), `output-method-xml` (`method="xml"`→`"html"`), and `missing-version-in-stylesheet` (insert `version="1.0"` after the element name). Attribute-deleting fixes (the namespace declaration, the `disable-output-escaping` and orphan `mode`/`priority` attributes) share `deletion(attribute)` in `src/fixes.js`. `src/fixer.js` maps each fix's position to a source offset and applies it *only* when the span still holds the exact `value` (a shifted offset — an entity ahead of the run, an already-edited file — is skipped, never corrupting the source), applying a file's fixes from the end backwards so earlier offsets stay valid, and returns the rewritten content per changed file plus the defects it applied. `src/xslint.js` writes the changed files (unless `--fix-dry-run`) and drops the applied defects from the report, so the exit code reflects only what remains.

Fixes come in two tiers, set by the `suggestion` flag on the `fix`. A plain fix is *safe* — deterministic and semantics-preserving — and `--fix` applies it. A fix with `suggestion: true` is *opinionated* — it changes behavior, removes code, or is one of several valid corrections — so `--fix` leaves it and only `--fix-suggestions` applies it (`fixer.js` takes a `suggestions` flag and gates on it). Every fix in `src/fixers.js` is a suggestion so far — deleting `disable-output-escaping` changes escaping, switching the output method changes serialization, the declared version is a guess, and dropping `mode`/`priority` is one of two corrections. When neither flag is passed, `xslint.js` counts the fixable defects and logs how many `--fix` would fix and how many more `--fix-suggestions` would. The fix engine is check-agnostic — the `fix` shape is the whole contract — so a new fixer attaches a `fix` (marking it a suggestion when it should be opt-in) and needs no engine change; the structural fixes (removing an unused variable, merging nested `xsl:if`) wait on the full-fidelity parser (#228) for exact per-node source spans.

## Keeping Docs in Sync

Any change to behavior — new logic, a new check or validator, a rename, a moved file, a changed flag or output — must update the documentation in the same change. Before finishing, check all three and fix whichever went stale:

- **`README.md`** — user-facing: installation, usage, the validators/linters overview, the contribution notes.
- **`CLAUDE.md`** (this file) — architecture: the flow diagram, the `(corpus, suppressions) => defects` shapes, the check/validator formats, the test-pack layout, and the Key Files table.
- **The docs site** — generated from `src/resources/checks/*` and `src/resources/motives/*`; regenerate with `npx grunt docs`. A new kind also needs wiring in `scripts/generate-docs.js`.

A change that leaves any of these describing the old behavior is not done.

## Key Files

| File | Role |
|------|------|
| `src/xslint.js` | Orchestrates file discovery, configuration, and suppression, runs validators then linters, formats output; exports the pure `lint(sources, options)` core (package `main`) plus `fixed` for embedders |
| `src/config.js` | Resolves `.xslint.yml` (rule severities/`off`, exclude globs, `max-warnings`), found by walking up from the cwd or via `--config` |
| `src/directives.js` | Parses inline `xslint-disable-*` comment directives and tests whether one suppresses a defect |
| `src/reporters.js` | Formats the collected defects for output — `text` (default), `json`, `sarif`, or `github` (GitHub Actions workflow-command annotations) — behind a uniform `reporterOf(format)` that `src/xslint.js` calls without knowing the format |
| `src/xsl-validator.js` | Builds the corpus from raw sources; reports each stylesheet that is not well-formed XML and leaves it out |
| `src/xpath-validator.js` | Splits each corpus expression into the valid ones (kept for the expression linters) and the malformed ones (reported) |
| `src/xpath-linter.js` | Loads `checks/xpath/*.yaml`, applies per-file XPath rules, and attaches any `src/fixers.js` fix to the defect |
| `src/fixers.js` | Maps a declarative check name to a `node => fix` builder, so an xpath rule can carry a fix — the suggestions for `using-disable-output-escaping`, `output-method-xml`, `missing-version-in-stylesheet`, `mode-or-priority-without-match` |
| `src/fixes.js` | Shared fix builders — `deletion(attribute)` reconstructs an attribute's ` name="value"` span for removal |
| `src/corpus-linter.js` | Loads `checks/corpus/*.yaml`, applies cross-file rules over the corpus |
| `src/xpath-axis-linter.js` | Tokenizes every XPath/pattern attribute in the corpus and flags each verbose axis (`unabbreviated-axis`) with a fix |
| `src/namespace-linter.js` | Walks the DOM for namespace prefixes declared but never used (`redundant-namespace-declarations`) and flags each with a delete fix |
| `src/node-set-linter.js` | Finds the redundant `node-set()` extension in a `@select` on XSLT 2.0/3.0 (`use-node-set-extension`) and flags each with an unwrap fix |
| `src/xpath-format-linter.js` | Tokenizes the validator's valid expressions and flags formatting noise (`redundant-whitespace`) with a fix |
| `src/tokens.js` | XPath lexer: positioned token stream (`TOKENS`: string, comment, whitespace, other) preserving whitespace |
| `src/fixer.js` | Applies the `fix` a defect carries to its source text (verify-before-apply, end-to-start) for `--fix`/`--fix-suggestions`/`--fix-dry-run` |
| `src/xpath.js` | Shared fontoxpath environment: prefixes, node/string evaluators, expression validator (`isValid`) |
| `src/helpers.js` | XML parsing (`@xmldom/xmldom`), YAML parsing, file recursion |
| `src/logger.js` | 4-level logger (debug/info/warning/error) |
| `scripts/generate-docs.js` | Builds the `docs/` site from checks + motives (`npx grunt docs`) |
| `test/helpers.js` | `runXslint` / `runXcop` test utilities |
| `test/xcop.test.js` | Runs xcop over the inline XSL of every pack directory; register new pack dirs here |
