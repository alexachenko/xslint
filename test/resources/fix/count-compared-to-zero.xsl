<?xml version="1.0" encoding="UTF-8"?>
<!--
* SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
* SPDX-License-Identifier: MIT
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2.0" id="count-fix">
  <xsl:template match="/">
    <xsl:if test="count(item) > 0">
      <xsl:variable name="blank" select="count(@x) = 0"/>
      <xsl:value-of select="0 != count(node())"/>
    </xsl:if>
  </xsl:template>
</xsl:stylesheet>
