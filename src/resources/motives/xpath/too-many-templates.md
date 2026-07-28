# Too many templates

A stylesheet that declares ten or more templates has grown too large to read
in one file, whatever the size of each template. Split it into smaller modules
and pull them together with `xsl:import` or `xsl:include`, so each file holds a
cohesive handful of templates.

Incorrect:

```xsl
<!-- one file declaring ten or more templates -->
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="a">...</xsl:template>
  <xsl:template match="b">...</xsl:template>
  <!-- ... eight or more further templates ... -->
</xsl:stylesheet>
```

Correct:

```xsl
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:import href="headings.xsl"/>
  <xsl:import href="tables.xsl"/>
  <xsl:import href="inline.xsl"/>
</xsl:stylesheet>
```
