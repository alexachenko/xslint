<?xml version="1.0" encoding="UTF-8"?>
<!--
* SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
* SPDX-License-Identifier: MIT
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0">
  <xsl:template match="/">
    <xsl:value-of select="foo(  a)"/>
    <xsl:if test=". = 'hi' ">
      <xsl:value-of select=" ."/>
    </xsl:if>
  </xsl:template>
</xsl:stylesheet>
