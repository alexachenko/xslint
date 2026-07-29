# Sort not first

`xsl:sort` declares the order of the sequence its `xsl:for-each` or
`xsl:apply-templates` iterates, so it must come first, before any other
content. One that follows other instructions is invalid: a processor rejects
it, and some silently ignore it, so the output looks unsorted for no visible
reason.

The check is report-only: moving the `xsl:sort` to the front is a structural
reorder that waits on the full-fidelity parser (#228).

Incorrect:

```xsl
<xsl:for-each select="item">
  <xsl:value-of select="."/>
  <xsl:sort select="@name"/>
</xsl:for-each>
```

Correct:

```xsl
<xsl:for-each select="item">
  <xsl:sort select="@name"/>
  <xsl:value-of select="."/>
</xsl:for-each>
```
