# Unknown version in stylesheet

The `version` attribute is what a processor reads to decide which language it
is running. XSLT compares it as a number, so `2`, `2.0` and `2.00` all name
version 2.0 and all behave alike; what a processor cannot do is make sense of a
value that is not a number at all. A stylesheet declaring `2,0` asks for a
version that does not exist, and each processor is free to answer differently —
Saxon reports an error, and a processor that guesses leniently may silently run
the whole stylesheet in the backwards-compatible mode meant for 1.0, where
`xsl:for-each-group`, sequence types and every other 2.0 construct in the file
stops behaving as written.

A version above the ones the reader knows raises the same question from the
other side. Declaring `4.0` tells a 3.0 processor that the stylesheet needs
something it does not have; XSLT's forwards-compatible mode will run it, but
silently, skipping instructions it does not recognise rather than reporting
them.

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
element, each setting the version of everything beneath it. A stylesheet that
raises one template to a version nobody recognises has left that subtree in the
same doubt as a whole file would be.
