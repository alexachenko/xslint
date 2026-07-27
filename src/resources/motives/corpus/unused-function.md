# Unused function

A stylesheet function that is called from no expression anywhere in the corpus
— neither in its own stylesheet nor in one that imports it — is dead code and
should be removed. Calling itself does not count, so a recursive function used
nowhere else is still flagged.

Incorrect:

```xsl
<xsl:function name="my:format">
  <xsl:param name="value"/>
  <xsl:value-of select="$value"/>
</xsl:function>
<!-- my:format is never referenced in match or select -->
```

Correct:

```xsl
<xsl:function name="my:format">
  <xsl:param name="value"/>
  <xsl:value-of select="$value"/>
</xsl:function>

<xsl:template match="/">
  <p><xsl:value-of select="my:format(title)"/></p>
</xsl:template>
```
