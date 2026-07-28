# Function complexity

A stylesheet function containing more than 50 XSLT elements is too complex to
read and test. A function should compute one value; when it grows this large it
is doing several jobs at once. Break it into smaller functions that each do one
thing and call one another.

This check looks only at `xsl:function`. A large `xsl:template` is a different
smell — it should fan out with `apply-templates` rather than be split into more
functions — and is covered by `oversized-template`.

Incorrect:

```xsl
<xsl:function name="my:report" as="xs:string">
  <!-- more than 50 xsl:* descendant elements computing one value -->
</xsl:function>
```

Correct:

```xsl
<xsl:function name="my:report" as="xs:string">
  <xsl:sequence select="my:header() || my:body() || my:footer()"/>
</xsl:function>

<xsl:function name="my:header" as="xs:string">
  <!-- ... -->
</xsl:function>
```
