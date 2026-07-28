# Oversized template

A single template holding more than 100 XSLT elements has stopped being a
template and become a program. XSLT is at its best when a template does a small
piece of the work and delegates the rest with `apply-templates`, letting the
processor match the right template to each node. A template this large is doing
by hand what the processor would do for you. Fan it out into focused templates.

This check looks only at `xsl:template`, and by element count, not lines — so a
template that is large only because it emits a lot of literal markup is left
alone; it is undecomposed *logic* that is the smell. A complex `xsl:function`
is covered separately by `function-complexity`.

Incorrect:

```xsl
<xsl:template match="/">
  <!-- more than 100 xsl:* elements: choose, if, for-each, value-of ... -->
</xsl:template>
```

Correct:

```xsl
<xsl:template match="/">
  <xsl:apply-templates select="header"/>
  <xsl:apply-templates select="section"/>
  <xsl:apply-templates select="footer"/>
</xsl:template>

<xsl:template match="section">
  <!-- one focused piece of the work -->
</xsl:template>
```
