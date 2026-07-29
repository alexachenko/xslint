# Param after content

`xsl:param` declares a parameter of its `xsl:template` or `xsl:function`, so it
must come first — before any variable, instruction, or literal result. A param
that follows real content is invalid XSLT, which a processor rejects and XML
well-formedness never catches, since the element is well-formed on its own.
(An `xsl:context-item`, and other `xsl:param` siblings, are the only things
allowed before it.)

The check is report-only: moving the param ahead of the content is a
structural reorder that waits on the full-fidelity parser (#228).

Incorrect:

```xsl
<xsl:template name="t">
  <xsl:variable name="v" select="1"/>
  <xsl:param name="p"/>
</xsl:template>
```

Correct:

```xsl
<xsl:template name="t">
  <xsl:param name="p"/>
  <xsl:variable name="v" select="1"/>
</xsl:template>
```
