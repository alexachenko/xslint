# Positional predicate written the long way

A predicate that holds a single number is, by definition, a test on the
context position: `foo[1]` means `foo[position() = 1]`, and `foo[last()]` means
`foo[position() = last()]`. Spelling the `position() =` out adds nothing — it is
the same selection, just longer to read.

The check fires only when the whole predicate is that lone comparison, in either
operand order — `[position() = 1]`, `[1 = position()]`, `[position() = last()]`,
`[last() = position()]`. The rewrite drops to the bare `[N]` or `[last()]`, which
is always the same node set, so `--fix` applies it safely. A predicate that does
more — `[position() = 1 and @current]`, `[position() > 1]`, or a value
comparison `[position() eq 1]` — is left alone, since there the `position()` is
load-bearing and cannot be dropped.

Incorrect:

```xsl
<xsl:value-of select="item[position() = 1]"/>
<xsl:apply-templates select="row[position() = last()]"/>
```

Correct:

```xsl
<xsl:value-of select="item[1]"/>
<xsl:apply-templates select="row[last()]"/>
```
