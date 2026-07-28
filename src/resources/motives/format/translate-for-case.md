# Translate for case

The XSLT 1.0 way to change case is a `translate()` spelling out both alphabets:

```xsl
translate(@ident, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')
```

XSLT 2.0 added `lower-case()` and `upper-case()`, which are shorter, say what
they mean, and fold all of Unicode rather than only ASCII. In a 2.0 or 3.0
stylesheet the `translate` spell-out is an anachronism.

Incorrect:

```xsl
<xsl:value-of select="translate(@id, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
```

Correct:

```xsl
<xsl:value-of select="lower-case(@id)"/>
```

The check fires only in XSLT 2.0 and 3.0 — in 1.0 the `translate` form is the
only option, so it is not a defect. The rewrite is offered as a
`--fix-suggestions` because `lower-case()` folds more characters than the ASCII
`translate`, so it is not a byte-for-byte equivalent. A `translate` with any
other pair of arguments is left alone.
