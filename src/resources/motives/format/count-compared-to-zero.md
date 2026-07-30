# Count compared to zero

`count($x) &gt; 0` and `count($x) = 0` ask the processor to walk the whole
sequence and tally it, only to find out whether it is empty. The question is
existence, and XPath states it directly: the sequence itself in a boolean
context, `exists($x)`, or `empty($x)` / `not($x)`. The direct form reads better
and lets the engine stop at the first item instead of counting every one.

Incorrect:

```xsl
<xsl:if test="count($items) &gt; 0">
<xsl:if test="count($items) = 0">
```

Correct:

```xsl
<xsl:if test="exists($items)">
<xsl:if test="empty($items)">
```

The operand order does not matter: `0 &lt; count($items)` and
`0 = count($items)` are flagged the same way. A comparison that is not an
existence test — `count($x) &gt; 1`, `count($x) = 5` — is a genuine count and is
left alone.

`exists()` and `empty()` are XPath 2.0 functions, so the `--fix` rewrite is
offered only on an XSLT 2.0/3.0 stylesheet. On 1.0 the smell is still reported —
the wasteful full walk is the same — but without a fix, since the direct 1.0
form (the node-set in a boolean context, or `not()`) depends on where the test
sits.
