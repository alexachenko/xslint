# Empty `xsl:variable`

An `xsl:variable` gets its value either from a `@select` attribute or from the
sequence constructor inside it. With neither, the variable binds to an empty
string — almost always a mistake, and at best a confusing way to declare an
empty value. State the value explicitly or drop the declaration.

A variable that declares a type with `@as` is a different case and is not
flagged: `<xsl:variable name="acc" as="node()*"/>` in XSLT 2.0 or 3.0 binds the
empty *sequence* of that type on purpose — a deliberate empty accumulator, not
an accidental empty string. The `@as` attribute only exists in 2.0/3.0, so its
presence is the signal that the emptiness is intentional.

Incorrect:

```xsl
<xsl:variable name="greeting"/>
```

Correct:

```xsl
<xsl:variable name="greeting" select="'hello'"/>
```

or:

```xsl
<xsl:variable name="greeting">hello</xsl:variable>
```

Also correct — a typed empty sequence:

```xsl
<xsl:variable name="acc" as="node()*"/>
```
