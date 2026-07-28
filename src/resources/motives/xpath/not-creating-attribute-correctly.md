# Not creating attribute correctly

The attribute analog of `not-creating-element-correctly`. When an `xsl:attribute`
with a static name sits on a literal result element and its value is simple — a
single `xsl:value-of`, plain text, or empty — it can be written inline as a
literal attribute, with an attribute value template for a computed value:

```xsl
<fo:block>
  <xsl:attribute name="line"><xsl:value-of select="@l"/></xsl:attribute>
  <xsl:attribute name="kind">head</xsl:attribute>
```

becomes

```xsl
<fo:block line="{@l}" kind="head">
```

The inline form is shorter and keeps the attribute next to the element it
belongs to. `xsl:attribute` earns its place when the name is computed (an AVT),
the value needs instructions an AVT cannot hold (an `xsl:choose`), or the parent
is itself an instruction such as `xsl:element` or `xsl:copy` — those are left
alone.
