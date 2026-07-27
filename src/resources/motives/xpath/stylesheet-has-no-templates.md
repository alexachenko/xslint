# Stylesheet has no templates

A stylesheet with no templates, functions, or variables offers nothing: it can
produce no output and exports nothing to import. Add at least one template. A
function or variable library — one whose definitions are pulled in by the
stylesheets that `xsl:import` it — is exempt, since its templates live in the
importer.

Incorrect:

```xsl
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html"/>
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
