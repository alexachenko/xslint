# Empty choose

An `xsl:choose` exists to pick among `xsl:when` branches, so one with no
`xsl:when` is degenerate. XSLT requires at least one `xsl:when`, so a processor
rejects it; and even read loosely, an `xsl:choose` holding only an
`xsl:otherwise` is a wrapper that always runs its single branch — the
`xsl:choose` adds nothing.

The check is report-only: the fix — deleting the `xsl:choose` and keeping its
`xsl:otherwise` content directly, or adding the missing `xsl:when` — is a
structural change and a judgement call.

Incorrect:

```xsl
<xsl:choose>
  <xsl:otherwise>fallback</xsl:otherwise>
</xsl:choose>
```

Correct:

```xsl
fallback
```
