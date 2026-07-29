# Otherwise not last

`xsl:otherwise` is the default branch of an `xsl:choose`, chosen only when no
`xsl:when` matches, so it belongs last. Anything after it — another `xsl:when`,
a second `xsl:otherwise` — is invalid: a processor rejects the misplaced
`xsl:otherwise`, and a reader is misled into thinking a later branch can run.

The check is report-only: reordering the branches so `xsl:otherwise` comes last
is a structural move that waits on the full-fidelity parser (#228).

Incorrect:

```xsl
<xsl:choose>
  <xsl:otherwise>none</xsl:otherwise>
  <xsl:when test="@a">a</xsl:when>
</xsl:choose>
```

Correct:

```xsl
<xsl:choose>
  <xsl:when test="@a">a</xsl:when>
  <xsl:otherwise>none</xsl:otherwise>
</xsl:choose>
```
