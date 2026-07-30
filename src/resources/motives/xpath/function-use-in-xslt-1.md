# Function use in a pre-2.0 stylesheet

`xsl:function` was introduced in XSLT 2.0. A stylesheet that declares
`version="1.0"` (or `1.1`, or no version at all) but defines an `xsl:function`
cannot run on a 1.0 processor — the instruction does not exist there. The check
fires whenever the root — `xsl:stylesheet` or `xsl:transform` — is not
`version="2.0"` or `version="3.0"`, so an unversioned or `1.1` stylesheet is
caught too, not only an explicit `1.0`.

Either replace the function with an `xsl:template` that has a `name`, or raise
the stylesheet to `version="2.0"`.

Incorrect:

```xsl
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
  <xsl:function name="my:foo">
    <!-- body logic -->
  </xsl:function>
</xsl:stylesheet>
```

Correct:

```xsl
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
  <xsl:template name="foo">
    <!-- body logic -->
  </xsl:template>
</xsl:stylesheet>
```

or:

```xsl
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2.0">
  <xsl:function name="my:foo">
    <!-- body logic -->
  </xsl:function>
</xsl:stylesheet>
```
