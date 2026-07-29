# Redundant double negation

`not(not(x))` negates `x` and then negates the result — a round trip that just
coerces `x` to a boolean. It is exactly `boolean(x)`, and in a boolean context
(an `xsl:if`/`xsl:when` `@test`) it is exactly `x`. Written as a double
negation it reads as a puzzle: the reader has to cancel the two `not`s in their
head to see what it means.

`not(not(x))` equals `boolean(x)` in every context, so `--fix` rewrites it
there. In a whole `@test` the value is already coerced to a boolean, so the fix
goes one step further to bare `x` — the same form `redundant-boolean-call`
would reduce `boolean(x)` to — rather than leaving a `boolean(x)` that check
would then flag.

Incorrect:

```xsl
<xsl:if test="not(not(@enabled))">
<xsl:value-of select="not(not(@enabled))"/>
```

Correct:

```xsl
<xsl:if test="@enabled">
<xsl:value-of select="boolean(@enabled)"/>
```
