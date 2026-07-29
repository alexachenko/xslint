# When or otherwise outside choose

`xsl:when` and `xsl:otherwise` mean something only inside an `xsl:choose` —
they are its branches. With any other parent they are invalid XSLT, which a
processor rejects and XML well-formedness never catches, since the element is
still well-formed on its own. The mistake is usually a stray branch left
outside its `xsl:choose`, or an `xsl:when` written where an `xsl:if` was meant.

The check is report-only: the right correction — wrapping the branch in an
`xsl:choose`, or rewriting an `xsl:when` as an `xsl:if` — is a judgement call,
not a single mechanical edit.

Incorrect:

```xsl
<xsl:template match="/">
  <xsl:when test="@enabled">on</xsl:when>
</xsl:template>
```

Correct:

```xsl
<xsl:template match="/">
  <xsl:if test="@enabled">on</xsl:if>
</xsl:template>
```
