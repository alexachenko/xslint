# Can use abbreviated axis specifier

The steps an XPath uses most often have short forms, and those short forms are
what every XSLT reader scans for. Spelling them out buries the shape of the
path under axis ceremony: `child::chapter/child::section/attribute::id` selects
exactly what `chapter/section/@id` selects, in nearly three times the width,
and the difference only grows inside a predicate, where the path is already
competing for the reader's attention. Worse, `child::` is noise that says
nothing — the child axis is the one a bare name already uses, so writing it out
draws the eye to the one part of the step that carries no information.

The abbreviations are exact synonyms defined by XPath itself, so the shorter
form selects precisely the same nodes:

| Longhand | Short |
| --- | --- |
| `child::name` | `name` |
| `attribute::name` | `@name` |
| `parent::node()` | `..` |
| `self::node()` | `.` |

Incorrect:

```xsl
<xsl:value-of select="child::title"/>
<xsl:value-of select="attribute::name"/>
<xsl:apply-templates select="parent::node()"/>
<xsl:copy-of select="self::node()"/>
<xsl:value-of select="child::book/child::author/attribute::id"/>
```

Correct:

```xsl
<xsl:value-of select="title"/>
<xsl:value-of select="@name"/>
<xsl:apply-templates select=".."/>
<xsl:copy-of select="."/>
<xsl:value-of select="book/author/@id"/>
```

Those four are the whole of the trade. `parent::chapter` and `self::chapter`
name an element rather than any node at all, so they have no shorter spelling
and stay as they are, and the remaining axes — `descendant::`, `ancestor::`,
`following-sibling::` and the rest — were never given one.

`descendant-or-self::node()` is the exception that is not worth taking. Its
short form is `//`, but the two are easy to confuse in use: a `//` that opens a
`select` walks the whole document from the root on every evaluation, which is
rarely what the longhand step meant. Where the abbreviation is wanted there,
anchor it — `.//author` searches the current subtree, `//author` searches the
entire document.
