# Name compared to a string

Testing an element's identity by string-comparing its name is slower and more
fragile than a node test:

```xsl
<xsl:if test="name() = 'div'">                    →  <xsl:if test="self::div">
<xsl:apply-templates select="*[local-name() = 'label']"/>
                                                  →  <xsl:apply-templates select="*[self::*:label]"/>
```

`name() = 'div'` compares the lexical QName, so it silently depends on the
prefix the source happens to use and breaks under a different but equivalent
namespace binding; `self::div` matches by expanded name. `local-name() = 'x'`
throws the namespace away, which XPath 2.0 writes as the wildcard `self::*:x`. A
node test also lets the engine match without building and comparing strings.

The rewrite is offered as a `--fix-suggestions`, since it changes lexical-name
matching to expanded-name matching — the intended correction, but a behavior
change. Only a comparison over the current node (`name()` / `name(.)`) with a
valid name is rewritten; a `local-name()` fix needs the `*:x` wildcard, so it is
offered only for XSLT 2.0 and 3.0.
