# String length compared to zero

`string-length($x) &gt; 0` and `string-length($x) = 0` measure the whole string
only to ask whether it holds any characters. The direct test says it plainly:
`$x != ''` for non-empty and `$x = ''` for empty. It reads better and stops at
the first character instead of counting them all. This is the same family as
comparing `count(...)` with zero to test existence.

Incorrect:

```xsl
<xsl:if test="string-length(@name) &gt; 0">
<xsl:if test="string-length(@name) = 0">
```

Correct:

```xsl
<xsl:if test="@name != ''">
<xsl:if test="@name = ''">
```

The operand order does not matter (`0 &lt; string-length(@name)` is flagged the
same way). When the argument is not a single operand — a union such as
`string-length($a | $b)`, where `X != ''` would not mean the same thing — the
comparison is still reported but left for a human to rewrite. Use
`normalize-space($x)` instead when whitespace-only should read as empty; that is
a different test, so it is not applied automatically.
