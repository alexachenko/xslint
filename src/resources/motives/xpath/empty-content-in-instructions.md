# Empty content in instructions

Instruction elements such as `xsl:for-each` and `xsl:if` with no content
produce no output and are almost certainly a mistake. An empty `xsl:when` or
`xsl:otherwise` is a deliberate "this case produces nothing" and is left
alone — the latter is exactly what `use-choose-without-otherwise` asks for.

Incorrect:

```xsl
<xsl:for-each select="item">
</xsl:for-each>
```

Correct:

```xsl
<xsl:for-each select="item">
  <xsl:value-of select="."/>
</xsl:for-each>
```
