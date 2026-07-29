# Redundant boolean call

The `@test` of an `xsl:if` or `xsl:when` already coerces its value to a boolean,
so wrapping the whole thing in `boolean(...)` adds nothing — `test="boolean(x)"`
and `test="x"` behave identically. The wrapper is just noise.

The check fires only when the entire `@test` is one `boolean(...)` call, where
dropping it is always safe, so `--fix` removes it. A `boolean(...)` that is only
part of a larger expression — `a = boolean(b)` — is left alone, because there
the coercion can change what the comparison means.

Incorrect:

```xsl
<xsl:if test="boolean(@enabled)">
```

Correct:

```xsl
<xsl:if test="@enabled">
```
