# Starts with double slash

A leading `//` on a `match` pattern is redundant: a template pattern is not
anchored, so `match="//item"` already selects exactly the same nodes as
`match="item"` — every `item`, at any depth. The `//` adds nothing but noise
(and, read carelessly, suggests a document scan that never happens). Drop it
and let the pattern say plainly which element it matches.

Incorrect:

```xsl
<xsl:template match="//item">
  <xsl:value-of select="."/>
</xsl:template>
```

Correct:

```xsl
<xsl:template match="item">
  <xsl:value-of select="."/>
</xsl:template>
```
