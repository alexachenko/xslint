# Missing id in stylesheet

The `id` attribute on the stylesheet root (`xsl:stylesheet` or `xsl:transform`)
is optional, and on a standalone
stylesheet it changes nothing about how the transform runs — it matters only
for a stylesheet embedded in another document and referenced by fragment. So
this is not a correctness rule; it is a consistency one. Declaring identity is
still worth doing: it distinguishes a stylesheet in logs, error messages, and
tooling that processes several at once. The only coherent policies are "every
stylesheet declares an id" or "none does", and the second cannot be enforced,
so xslint asks for the first.

Incorrect:

```xsl
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <!-- stylesheet logic -->
</xsl:stylesheet>
```

Correct:

```xsl
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" id="stylesheet_name">
    <!-- stylesheet logic -->
</xsl:stylesheet>
```
