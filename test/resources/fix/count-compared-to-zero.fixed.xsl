<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2.0" id="count-fix">
  <xsl:template match="/">
    <xsl:if test="exists(item)">
      <xsl:variable name="blank" select="empty(@x)"/>
      <xsl:value-of select="exists(node())"/>
    </xsl:if>
  </xsl:template>
</xsl:stylesheet>
