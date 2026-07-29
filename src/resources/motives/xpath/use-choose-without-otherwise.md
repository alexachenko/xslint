# Use choose without otherwise

An `xsl:choose` with two or more `xsl:when` branches but no `xsl:otherwise`
silently produces no output when none of them matches. Add `xsl:otherwise` to
handle unexpected values explicitly. (A single-`when` `choose` is better
written as an `xsl:if` — `use-single-option-for-choose` — and one with no
`xsl:when` at all is reported by `empty-choose`.)

Incorrect:

```xsl
<xsl:choose>
  <xsl:when test="@type = 'a'">A</xsl:when>
  <xsl:when test="@type = 'b'">B</xsl:when>
</xsl:choose>
```

Correct:

```xsl
<xsl:choose>
  <xsl:when test="@type = 'a'">A</xsl:when>
  <xsl:when test="@type = 'b'">B</xsl:when>
  <xsl:otherwise>Unknown</xsl:otherwise>
</xsl:choose>
```
