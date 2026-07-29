# Redundant import

Importing or including the same module twice in one stylesheet adds nothing —
the second reference brings in the same templates, functions, and variables the
first already did. At best it is noise; at worst it muddies import precedence
and hides which reference a reader should reason about. Keep a single
`xsl:import`/`xsl:include` per module.

The linter resolves each `@href` against the importing file's own directory, so
two spellings that point at the same file (`lib/util.xsl` and `./lib/util.xsl`)
count as one, and a module imported once directly and once from a sibling is
not confused with a genuine duplicate — only repeats within a single
stylesheet's own list are flagged. A self-import or a cross-file cycle is a
different fault, reported by `circular-import`.

Incorrect:

```xsl
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:import href="common.xsl"/>
  <xsl:import href="common.xsl"/>
</xsl:stylesheet>
```

Correct:

```xsl
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:import href="common.xsl"/>
</xsl:stylesheet>
```
