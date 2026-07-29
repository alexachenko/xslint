# Redundant double negation

`not(not(x))` negates `x` and then negates the result — a round trip that just
coerces `x` to a boolean. It is exactly `boolean(x)`, and in a boolean context
(an `xsl:if`/`xsl:when` `@test`) it is exactly `x`. Written as a double
negation it reads as a puzzle: the reader has to cancel the two `not`s in their
head to see what it means.

The rewrite to `boolean(x)` is always equivalent, so `--fix` applies it safely.

Incorrect:

```xsl
<xsl:if test="not(not(@enabled))">
```

Correct:

```xsl
<xsl:if test="boolean(@enabled)">
```
