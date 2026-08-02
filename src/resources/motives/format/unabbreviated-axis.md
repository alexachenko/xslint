# Can use abbreviated axis specifier

The steps an XPath uses most often have short forms, and those short forms are
what every XSLT reader scans for. Spelling them out buries the shape of the
path under axis ceremony: `child::chapter/child::section/attribute::id` selects
exactly what `chapter/section/@id` selects, in nearly three times the width,
and the difference only grows inside a predicate, where the path is already
competing for the reader's attention. Worse, `child::` is noise that says
nothing — the child axis is the one a bare name already uses, so writing it out
draws the eye to the one part of the step that carries no information.

The abbreviations are defined by XPath itself and select precisely the same
nodes as the longhand — in an expression. A `match` is not an expression but a
pattern, a narrower grammar with its own rules about where `.` may stand and its
own way of deciding which template wins, so the table below is about `select`
and `test`, and a pattern is discussed at the end:

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

The node-sets match, but the grammars do not quite, and on XSLT 1.0 that shows.
There `.` and `..` are an *abbreviated step*, a production that takes no
predicate, while the longhand is a full step and a full step accepts them. So
`self::node()[1]` is legal in a 1.0 stylesheet and `.[1]` is a syntax error in
it — XPath 2.0 gave the context item its own predicate list and lifted the
restriction, which is why the same expression compiles under a later `version`.
Where a predicate follows the step in a 1.0 stylesheet, either leave it spelled
out or parenthesise the abbreviation, since `(.)[1]` is a filter expression and
is legal in every version.

In a pattern only the first two rows hold. A pattern takes the child and
attribute axes, so `match="child::chapter"` is `match="chapter"` and nothing
changes. The abbreviated steps are another matter: `.` is a pattern in its own
right rather than a step inside one, so it cannot stand in a union or behind a
parenthesis — `match="y|self::node()"` is legal and `match="y|."` will not
compile — and where it does parse it is weighed differently against a competing
template. Leave a longhand step alone in a `match`, a `count`, a `from`, or an
`xsl:for-each-group` boundary.

`descendant-or-self::node()` is the exception that is not worth taking. Its
short form is `//`, but the two are easy to confuse in use: a `//` that opens a
`select` walks the whole document from the root on every evaluation, which is
rarely what the longhand step meant. Where the abbreviation is wanted there,
anchor it — `.//author` searches the current subtree, `//author` searches the
entire document.
