# Not creating attribute correctly

The attribute analog of `not-creating-element-correctly`. When an `xsl:attribute`
with a static name sits on a literal result element and its value is simple — a
single `xsl:value-of`, plain text, or empty — it can be written inline as a
literal attribute, with an attribute value template for a computed value:

```xsl
<td>
  <xsl:attribute name="class"><xsl:value-of select="@c"/></xsl:attribute>
  <xsl:attribute name="role">cell</xsl:attribute>
```

becomes

```xsl
<td class="{@c}" role="cell">
```

The inline form is shorter and keeps the attribute next to the element it
belongs to. `xsl:attribute` earns its place when the name is computed (an AVT),
the value needs instructions an AVT cannot hold (an `xsl:choose`), or the parent
is itself an instruction such as `xsl:element` or `xsl:copy` — those are left
alone.
