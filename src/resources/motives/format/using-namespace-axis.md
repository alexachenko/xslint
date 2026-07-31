# Using namespace axis

The `namespace::` axis is deprecated in XSLT 2.0 and remains so in 3.0, where
some processors drop it entirely — a stylesheet that leans on it may not run at
all. Inspect namespace bindings with the standard functions `in-scope-prefixes()`
and `namespace-uri-for-prefix()` instead. In XSLT 1.0 the axis is standard, so
the concern begins at 2.0.

Incorrect:

```xsl
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html"/>
  <xsl:template match="*">
    <xsl:for-each select="namespace::*">
      <xsl:value-of select="."/>
    </xsl:for-each>
  </xsl:template>
</xsl:stylesheet>
```

Correct:

```xsl
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html"/>
  <xsl:template match="*">
    <xsl:variable name="element" select="."/>
    <xsl:for-each select="in-scope-prefixes($element)">
      <xsl:value-of select="namespace-uri-for-prefix(., $element)"/>
    </xsl:for-each>
  </xsl:template>
</xsl:stylesheet>
```

Which function replaces the axis depends on what the namespace node was read for:
its name is a prefix, its string value the namespace URI. A `namespace::*` walked
for its prefixes becomes `in-scope-prefixes(.)`; a `namespace::foo` read for its
URI becomes `namespace-uri-for-prefix('foo', .)`. Two cases need care:
`count(namespace::*)` becomes `count(in-scope-prefixes(.))`, but that raises a
type error on a context node that is not an element, where the axis merely
yielded nothing; and a `namespace::foo` copied by `xsl:copy-of` writes a
namespace node into the result tree, which no function returns — recreate it with
`xsl:namespace`, as
`<xsl:namespace name="foo" select="namespace-uri-for-prefix('foo', .)"/>`.
