# Circular import

A stylesheet must not `xsl:import` or `xsl:include`, directly or through a
chain, a stylesheet that pulls it back — nor import itself. A processor treats
this as a static error (`XTSE0210`) and refuses to compile the stylesheet, so
the cycle is never a working design, only a mistake to break.

The linter resolves every `@href` against the importing file's own directory
and matches it to the corpus. A cycle needs every edge in it to resolve within
the files being linted, so an href pointing at a library outside the corpus is
treated as external and never mistaken for part of a cycle.

Incorrect (`a.xsl` and `b.xsl` import each other):

```xsl
<!-- a.xsl -->
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:import href="b.xsl"/>
</xsl:stylesheet>

<!-- b.xsl -->
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:import href="a.xsl"/>
</xsl:stylesheet>
```

Correct — move the shared code into a third module both import, so the graph
stays acyclic:

```xsl
<!-- a.xsl -->
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:import href="common.xsl"/>
</xsl:stylesheet>

<!-- b.xsl -->
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:import href="common.xsl"/>
</xsl:stylesheet>
```
