# Using not outermost stylesheet

The stylesheet root — `xsl:stylesheet` or its synonym `xsl:transform` — must be
the outermost element of an XSLT document. A nested `xsl:stylesheet` or
`xsl:transform` inside a template body is invalid and will be rejected by a
conformant XSLT processor.

Incorrect:

```xsl
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    </xsl:stylesheet>
  </xsl:template>
</xsl:stylesheet>
```

Correct:

```xsl
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <p><xsl:value-of select="."/></p>
  </xsl:template>
</xsl:stylesheet>
```
