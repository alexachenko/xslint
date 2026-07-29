# Unreachable function

A stylesheet function is reachable only if some call to it lives outside every
function body — in a template, a global variable, or another function that is
itself reachable. A function that is called, but only from within a recursion
cycle nothing enters, can never run: a function that calls only itself, or a
pair (`my:even`/`my:odd`) that call only each other, are dead code even though
each name does appear in a call. Delete the cycle, or start it from a template.

Unlike `unused-function`, which flags a name that appears in no call at all,
this check flags a name that *is* called yet stays unreachable.

Incorrect:

```xsl
<xsl:function name="my:even" as="xs:boolean">
  <xsl:param name="number" as="xs:integer"/>
  <xsl:sequence select="if ($number = 0) then true() else my:odd($number - 1)"/>
</xsl:function>
<xsl:function name="my:odd" as="xs:boolean">
  <xsl:param name="number" as="xs:integer"/>
  <xsl:sequence select="if ($number = 0) then false() else my:even($number - 1)"/>
</xsl:function>
<!-- neither my:even nor my:odd is ever called from a template -->
```

Correct:

```xsl
<xsl:function name="my:even" as="xs:boolean">
  <xsl:param name="number" as="xs:integer"/>
  <xsl:sequence select="if ($number = 0) then true() else my:odd($number - 1)"/>
</xsl:function>
<xsl:function name="my:odd" as="xs:boolean">
  <xsl:param name="number" as="xs:integer"/>
  <xsl:sequence select="if ($number = 0) then false() else my:even($number - 1)"/>
</xsl:function>

<xsl:template match="/">
  <xsl:value-of select="my:even(count(//node()))"/>
</xsl:template>
```
