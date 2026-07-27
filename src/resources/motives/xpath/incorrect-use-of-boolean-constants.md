# Incorrect use of boolean constants

When an `xsl:if` or `xsl:when` test is the bare string `'true'` or `'false'`,
it is a non-empty string, so the branch is *always* taken — `test="'false'"`
runs when you meant it never should. Say what you mean with the boolean
functions `true()` and `false()`.

Incorrect (the branch always runs):

```xsl
<xsl:if test="'false'">
  <xsl:value-of select="."/>
</xsl:if>
```

Correct:

```xsl
<xsl:if test="false()">
  <xsl:value-of select="."/>
</xsl:if>
```

Comparing a value to the string `'true'` is a different thing and correct —
XML attributes are strings, so `@active = 'true'` is how you test one. That,
and literal output like `<td hidden="true"/>`, are left alone.
