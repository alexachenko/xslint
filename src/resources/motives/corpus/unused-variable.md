# Unused variable

A variable whose `$name` is referenced nowhere it is in scope — within its own
parent for a local one, or anywhere in the corpus (including a stylesheet that
imports it) for a top-level one — is dead code and should be removed.

Incorrect:

```xsl
<xsl:variable name="greeting" select="'Hello'"/>
<!-- $greeting is never referenced -->
```

Correct:

```xsl
<xsl:variable name="greeting" select="'Hello'"/>
<p><xsl:value-of select="$greeting"/></p>
```
