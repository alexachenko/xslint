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

A comparison that is not an existence test — `count($x) &gt; 1`, `count($x) = 5`
— is a genuine count and is left alone.
