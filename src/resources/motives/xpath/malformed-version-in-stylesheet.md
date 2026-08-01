# Malformed version in stylesheet

The `version` attribute is what a processor reads to decide which language it
is running, and it is declared as an `xs:decimal`. That is why `2`, `2.0` and
`2.00` all name version 2.0 and behave alike, and why a value that is not a
decimal at all names nothing: `2,0` is a typo for a version, `2e0` is a spelling
the type does not have, and an empty `version` says as much as no version would.

A processor is free to answer any of those differently, and the quiet answer is
the dangerous one. Where the effective version cannot be read as 1.0, the
stylesheet is not in XSLT 1.0 behaviour, so a processor that shrugs and carries
on may run `xsl:for-each-group`, sequence types and every other construct in the
file under rules the author never chose — or it may reject the stylesheet
outright. Which of the two you get is not something the file decides.

Incorrect:

```xsl
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2,0">
  <xsl:template match="/">
    <xsl:value-of select="count(item)"/>
  </xsl:template>
</xsl:stylesheet>
```

Correct:

```xsl
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2.0">
  <xsl:template match="/">
    <xsl:value-of select="count(item)"/>
  </xsl:template>
</xsl:stylesheet>
```

The same applies wherever a version is declared, not only at the root: XSLT 2.0
lets `version` sit on any XSLT element and `xsl:version` on any literal result
element, each setting the version of everything beneath it. A template raised to
a value that names no version leaves that subtree in the same doubt a whole file
would be in.

A version that is a decimal is a different matter, even one no processor has
shipped yet. `version="4.0"` is well formed and says plainly which language the
author wants; a 3.0 processor runs it forwards-compatibly, and the only cost is
that instructions from a later version go unrecognised. One exception is worth
knowing about: `version` on `xsl:output` is not the language at all but the
version of the output method, so `4.0` there asks for HTML 4.0 and is ordinary.
On `xsl:result-document` the serialization parameter is spelled
`output-version`, precisely so the two do not collide — writing `version` there
declares the language for everything the instruction contains.
